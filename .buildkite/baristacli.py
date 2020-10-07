#!/usr/bin/env python3
import sys
import argparse
import logging
import yaml
import os
import subprocess
import copy

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
    "name": "AWS Linux 2",
    "platform": "linux"
  },
  "windows10": {
    "name": "Windows 10",
    "platform": "windows"
  }
}


class BuildKiteConfigError(ValueError):
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

  if args.target == "test_sharding" and not 'bazel_cmd' in stage[args.target]:
    execute_command(
      [BAZEL_BINARY] + [args.target.split("_")[0]] + test_sharding(
        int(args.shard)))
  else:
    if 'bazel_cmd' in stage[args.target]:
      execute_command(
        [BAZEL_BINARY] + [args.target] + stage[args.target]['bazel_cmd'])
    if 'cmd' in stage[args.target]:
      execute_shell_commands(stage[args.target]['cmd'])

  if "post_cmd" in stage[args.target]:
    execute_shell_commands(stage[args.target]['post_cmd'])


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

  pipeline_steps = []

  # clean disabled tasks
  for _task, task_config in TMP_TASKS["tasks"].items():
    for command, instructions in task_config.items():
      if 'disable' in instructions and instructions['disable'] == True:
        TASKS["tasks"][_task].pop(command)

  for _task, task_config in TASKS["tasks"].items():
    if 'shell_command' in task_config:
      pipeline_steps.append(getCommand(_task, 'shell_command'))

    if 'build' in task_config:
      pipeline_steps.append(getCommand(_task, 'build'))

    if 'test_sharding' in task_config \
      and 'parallel' in task_config['test_sharding']:
      for shard in range(1, task_config['test_sharding']['parallel'] + 1):
        pipeline_steps.append(getCommand(_task, 'test_sharding', shard))
    else:
      if 'test' in task_config:
        pipeline_steps.append(getCommand(_task, 'test'))

  print(yaml.dump({"steps": pipeline_steps}))


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
