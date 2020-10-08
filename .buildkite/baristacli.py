#!/usr/bin/env python3
import sys
import argparse
import logging
import yaml
import json
import os
import subprocess
import copy
from urllib.request import url2pathname
from urllib.parse import urlparse
from shutil import copyfile
import tempfile

# path to buildscript (called from root directory of the repository)
SCRIPT = os.path.join(os.path.basename(os.path.dirname(__file__)),
                      os.path.basename(__file__))

# default path of configuration file
CONFIGFILE = os.path.join(os.path.basename(os.path.dirname(__file__)),
                          "baristaPipeline.yml")

# default bazel binary
BAZEL_BINARY = "bazel"

# configuration of allowed buildkite instances
# PLATFORMS = {
#   "default" : {            # BuildKite queue name
#     "name": "AWS Linux 2", # label
#     "platform": "linux"    # specify platform (linux/windows)
#   },
# }
PLATFORMS = {
  "default": {
    "name": ":linux: AWS Linux 2",
    "platform": "linux"
  },
  "windows10": {
    "name": ":windows: Windows 10",
    "platform": "windows"
  }
}


class BuildKiteConfigError(ValueError):
  pass

class BazelFailingTests(Exception):
  pass

def is_windows():
  """
  Return True if we are on windows.
  """
  return os.name == "nt"


# set script extension depending on platform
SCRIPT_EXTENSION = ".sh" if not is_windows() else ".bat"


def eprint(*args, **kwargs):
  """
  Print to stderr and flush (just in case).
  """
  print(*args, flush=True, file=sys.stderr, **kwargs)


def execute_shell_commands(commands):
  """
  Prepare given list of commands and execute it
  :param commands: array if commands
  """
  if not commands:
    return
  if is_windows():
    print_collapsed_group(":cmd: Setup (Windows Commands)")
    for cmd in commands:
      execute_command(cmd.split(" "), shell=True)
  else:
    print_collapsed_group(":bash: Setup (Shell Commands)")
    shell_command = "\n".join(["set -e"] + commands)
    execute_command([shell_command], shell=True)


def execute_command(args, shell=False, fail_if_nonzero=True, cwd=None,
                    print_output=True):
  """
  Execute command
  """
  if print_output:
    eprint(" ".join(args))
  return subprocess.run(
    args, shell=shell, check=fail_if_nonzero, env=os.environ, cwd=cwd
  ).returncode


def arg_hander_command(args):
  """
  Prepare the given platform and task to be able to call it
  """
  TASKS = load_config(args.config)

  if not args.platform in TASKS["tasks"].keys():
    raise BuildKiteConfigError(
      "{} is not available. Please specify one of {}".format(args.platform,
                                                             PLATFORMS.keys()))

  stage = TASKS["tasks"].get(args.platform)

  if not args.target in stage:
    raise BuildKiteConfigError(
      "{} is not available. Please specify one of {}".format(args.target,
                                                             stage.keys()))

  # execute pre commands
  if "pre_cmd" in stage[args.target]:
    execute_shell_commands(stage[args.target]['pre_cmd'])

  # bazel build info file
  build_event_file = "build_event_file.json"

  if args.target == "test" and 'parallel' in stage[args.target]:
    bazel_flags = stage[args.target]["bazel_flags"] if "bazel_flags" in stage[
      args.target] else []
    # add build event json
    bazel_flags += ["--build_event_json_file={}".format(build_event_file)]
    execute_command(
      [BAZEL_BINARY] + [args.target.split("_")[0]] + test_sharding(
        int(args.shard)), fail_if_nonzero=True if not inCI() else False)
  else:
    if 'bazel_cmd' in stage[args.target]:
      bazel_flags = stage[args.target]["bazel_flags"] if "bazel_flags" in stage[
        args.target] else []
      # add build event json
      bazel_flags += ["--build_event_json_file={}".format(build_event_file)]
      execute_command(
        [BAZEL_BINARY] + [args.target] + stage[args.target][
          'bazel_cmd'] + bazel_flags, fail_if_nonzero=False if args.target == "test" and inCI() else True)
    if 'cmd' in stage[args.target]:
      execute_shell_commands(stage[args.target]['cmd'])

  # analyse Test logs and fail afterwards
  if upload_test_logs_from_bep(build_event_file) > 0:
    raise BazelFailingTests("Tests failed")

  if "post_cmd" in stage[args.target]:
    execute_shell_commands(stage[args.target]['post_cmd'])

def inCI():
  # only if we are in CI
  if "BUILDKITE" in os.environ:
    return True
  return  False

def upload_test_logs_from_bep(bep_file):
  if not inCI():
    return 0

  tmpdir = tempfile.mkdtemp()
  if os.path.exists(bep_file):
    all_test_logs = analyseLogs(bep_file)

    if all_test_logs:
      files_to_upload = rename_test_logs_for_upload(all_test_logs, tmpdir)
      cwd = os.getcwd()
      try:
        os.chdir(tmpdir)
        test_logs = [os.path.relpath(file, tmpdir) for file in files_to_upload]
        test_logs = sorted(test_logs)
        execute_command(
          ["buildkite-agent", "artifact", "upload", ";".join(test_logs)])
      finally:
        os.chdir(cwd)
    return len(all_test_logs)
  return 0

def rename_test_logs_for_upload(test_logs, tmpdir):
  # Rename the test.log files to the target that created them
  # so that it's easy to associate test.log and target.
  new_paths = []
  for label, files in test_logs:
    attempt = 0
    if len(files) > 1:
      attempt = 1
    for test_log in files:
      try:
        new_path = test_label_to_path(tmpdir, label, attempt)
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        copyfile(test_log, new_path)
        new_paths.append(new_path)
        attempt += 1
      except IOError as err:
        # Log error and ignore.
        eprint(err)
  return new_paths


def test_label_to_path(tmpdir, label, attempt):
  # remove leading //
  path = label[2:]
  path = path.replace("/", os.sep)
  path = path.replace(":", os.sep)
  if attempt == 0:
    path = os.path.join(path, "test.log")
  else:
    path = os.path.join(path, "attempt_" + str(attempt) + ".log")
  return os.path.join(tmpdir, path)


def analyseLogs(build_event_file, status=["FAILED", "TIMEOUT", "FLAKY"]):
  targets = []
  with open(build_event_file, encoding="utf-8") as f:
    raw_data = f.read()
  decoder = json.JSONDecoder()

  pos = 0
  while pos < len(raw_data):
    try:
      bep_obj, size = decoder.raw_decode(raw_data[pos:])
    except ValueError as e:
      eprint("JSON decoding error: " + str(e))
      return targets
    if "testSummary" in bep_obj:
      test_target = bep_obj["id"]["testSummary"]["label"]
      test_status = bep_obj["testSummary"]["overallStatus"]
      if test_status in status:
        outputs = bep_obj["testSummary"]["failed"]
        test_logs = []
        for output in outputs:
          test_logs.append(url2pathname(urlparse(output["uri"]).path))
        targets.append((test_target, test_logs))
    pos += size + 1

  return targets


def setup_logging(verbose=False):
  logging.basicConfig(format='%(levelname)s - %(module)s: %(message)s',
                      level=logging.DEBUG if verbose else logging.INFO)


def getCommand(_platform, target, shard=0):
  """
  Generate buildkite pipeline config as yaml and print it to stdout
  """
  if not PLATFORMS[_platform]["platform"] == "windows":
    extension = ".sh"
    sourceit = "source"
    pathSep = "/"
    python_bin = "python3"
  else:
    extension = ".bat"
    sourceit = ""
    pathSep = "\\"
    python_bin = "python"
  step = {
    "label": "{}-{}{}".format(PLATFORMS[_platform]["name"], target,
                              "" if shard == 0 else "-{}".format(shard)),
    "command": "{} .buildkite{}requirement{} && {} {} {} --platform={} --target={} {}".format(
      sourceit, pathSep, extension, python_bin, SCRIPT, 'exec', _platform,
      target, "" if shard == 0 else "--shard={}".format(shard)),
    "agents": {"queue": _platform},
  }

  return step


def test_sharding(shard_id):
  shard_count = int(os.getenv("BUILDKITE_PARALLEL_JOB_COUNT", "-1"))
  test_targets = []

  test_targets += execute_command_and_get_output(
    [
      BAZEL_BINARY,
      "--nomaster_bazelrc",
      "--bazelrc=/dev/null",
      "query",
      "tests(//...)",
    ],
    print_output=False,
  ).strip().split("\n")

  if shard_id > -1 and shard_count > -1:
    print_collapsed_group(
      ":female-detective: Calculating targets for shard {}/{}".format(
        shard_id + 1, shard_count
      )
    )
    expanded_test_targets = expand_test_target_patterns(BAZEL_BINARY,
                                                        test_targets)
    test_targets = get_targets_for_shard(expanded_test_targets, shard_id,
                                         shard_count)

  return test_targets


def bubble_sort(array):
  n = len(array)

  for i in range(n):
    # Create a flag that will allow the function to
    # terminate early if there's nothing left to sort
    already_sorted = True

    # Start looking at each item of the list one by one,
    # comparing it with its adjacent value. With each
    # iteration, the portion of the array that you look at
    # shrinks because the remaining items have already been
    # sorted.
    for j in range(n - i - 1):
      if array[j] > array[j + 1]:
        # If the item you're looking at is greater than its
        # adjacent value, then swap them
        array[j], array[j + 1] = array[j + 1], array[j]

        # Since you had to swap two elements,
        # set the `already_sorted` flag to `False` so the
        # algorithm doesn't finish prematurely
        already_sorted = False

    # If there were no swaps during the last iteration,
    # the array is already sorted, and you can terminate
    if already_sorted:
      break

  return array


def expand_test_target_patterns(BAZEL_BINARY, test_targets):
  included_targets, excluded_targets = partition_targets(test_targets)
  excluded_string = (
    " except tests(set({}))".format(
      " ".join("'{}'".format(t) for t in excluded_targets))
    if excluded_targets
    else ""
  )

  exclude_manual = ' except tests(attr("tags", "manual", set({})))'.format(
    " ".join("'{}'".format(t) for t in included_targets)
  )

  eprint("Resolving test targets via bazel query")
  output = execute_command_and_get_output(
    [BAZEL_BINARY]
    + [
      "--nomaster_bazelrc",
      "--bazelrc=/dev/null",
      "query",
      "tests(set({})){}{}".format(
        " ".join("'{}'".format(t) for t in included_targets),
        excluded_string,
        exclude_manual,
      ),
    ],
    print_output=False,
  )
  return output.strip().split("\n")


def partition_targets(targets):
  included_targets, excluded_targets = [], []
  for target in targets:
    if target.startswith("-"):
      excluded_targets.append(target[1:])
    else:
      included_targets.append(target)

  return included_targets, excluded_targets


def get_targets_for_shard(targets, shard_id, shard_count):
  "Split the targets in the shards"
  return bubble_sort(targets)[shard_id::shard_count]


def print_collapsed_group(name):
  eprint("\n\n--- {0}\n\n".format(name))


def execute_command_and_get_output(
  args,
  shell=False,
  fail_if_nonzero=True,
  print_output=True
):
  "Executes a command in a subprocess"
  eprint(" ".join(args))
  process = subprocess.run(
    args,
    shell=shell,
    check=fail_if_nonzero,
    env=os.environ,
    stdout=subprocess.PIPE,
    errors="replace",
    universal_newlines=True,
  )
  if print_output:
    eprint(process.stdout)

  return process.stdout


####################

def load_config(file_config):
  """
  Load configuration file
  """
  file_config = file_config or CONFIGFILE
  with open(file_config, "r") as fd:
    config = yaml.safe_load(fd)
  return config


def arg_hander_pipeline(args):

  TMP_TASKS = load_config(args.config)
  TASKS = copy.deepcopy(TMP_TASKS)

  # clean disabled tasks
  for _task, task_config in TMP_TASKS["tasks"].items():
    for command, instructions in task_config.items():
      if 'disable' in instructions and instructions['disable'] == True:
        TASKS["tasks"][_task].pop(command)

  print(yaml.dump({"steps": generatePipeline(args, tasks=TASKS, targets=["build"])}))


def generatePipeline(args, tasks=None, targets=[]):

  pipeline_steps = []
  triggerStages = []
  for target in targets:
    for _task, task_config in tasks["tasks"].items():
      if target in task_config:
        if 'parallel' in task_config[target]:
          for shard in range(1, task_config[target]['parallel'] + 1):
            pipeline_steps.append(getCommand(_task, target, shard=shard))
          triggerStages.extend(task_config[target]['trigger'] if 'trigger' in task_config[target] else [])
        else:
          pipeline_steps.append(getCommand(_task, target))
          triggerStages.extend(task_config[target]['trigger'] if 'trigger' in task_config[target] else [])
    if len(triggerStages) > 0:
      pipeline_steps.append({"wait": None})

  if len(triggerStages) > 0:
    pipeline_steps.extend(generatePipeline(args,tasks=tasks,targets=list(dict.fromkeys(triggerStages))))
  return pipeline_steps

def main():
  parser = argparse.ArgumentParser(
    description='commandline interface for building barista with bazel on buildkite', )

  parser.set_defaults()
  parser.add_argument('-v', '--verbose', action='store_true',
                      help='verbose logging')

  sub_parsers = parser.add_subparsers()
  sub_parsers.required = True
  sub_parsers.dest = 'SUBCOMMAND'

  sub_parser_buildkite_pipeline = sub_parsers.add_parser('pipeline',
                                                         help='configure buildkite pipeline while printing to stdout')
  sub_parser_buildkite_pipeline.add_argument('--config',
                                             help="specify config file",
                                             required=False)

  sub_parser_buildkite_pipeline.set_defaults(handler=arg_hander_pipeline)

  sub_parser_command = sub_parsers.add_parser('exec',
                                              help='exec specified target on given platform')
  sub_parser_command.add_argument('--config', help="specify config file",
                                  required=False)
  sub_parser_command.add_argument('--platform', help="specify platform",
                                  required=True)
  sub_parser_command.add_argument('--target', help="specify target",
                                  required=True)
  sub_parser_command.add_argument('--shard', help="specify shard",
                                  required=False)
  sub_parser_command.set_defaults(handler=arg_hander_command)

  args = parser.parse_args(sys.argv[1:])

  setup_logging(args.verbose)

  ret = 0
  try:
    ret = args.handler(args)
  except Exception as e:
    logging.exception("buildscript error")
    ret = 1

  return ret


if __name__ == "__main__":
  sys.exit(main())
