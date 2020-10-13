#!/bin/bash

# The script should immediately exit if any command in the script fails.
set -e

SCRIPT=$(readlink -f "$0")
DIR=$(dirname "$SCRIPT")

bazel_rc="${DIR}/../bazel.rc"

PULL_BRANCH_REGEX="^pull\/[0-9]+$"

# Forked pull requests have CIRCLE_BRANCH set to pull/XXX
if [[ "${BUILDKITE_BRANCH}" =~ $PULL_BRANCH_REGEX ]]; then
  echo "Forked pull request no setup for upload to remote chache!"
  echo "build --remote_upload_local_results=false" >> ${bazel_rc}
  exit 0
fi

if [ -z "${BAZEL_REMOTE_CACHE_PASSWORD}" ]; then
  echo "Please specify the \"BAZEL_REMOTE_CACHE_PASSWORD\" environment variable when setting up remote " \
      "cache"
  exit 1
fi

# Decode the GCP token that is needed to authenticate the Bazel remote execution.
openssl aes-256-cbc -salt -a -d\
  -out "${DIR}/cache-write-key.json" \
  -in "${DIR}/cache-write-key.json.enc" \
  -md sha1 \
  -pass "pass:${BAZEL_REMOTE_CACHE_PASSWORD}"

BAZEL_CACHE_DIR="${DIR/$(pwd)\//}"

echo "build --google_credentials=${BAZEL_CACHE_DIR}/cache-write-key.json" >> ${bazel_rc}
echo "build --remote_upload_local_results=true" >> ${bazel_rc}
