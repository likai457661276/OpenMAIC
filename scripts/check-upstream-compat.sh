#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REF="${UPSTREAM_REF:-upstream/main}"
if [[ -z "${BASE_REF:-}" ]]; then
  BASE_REF="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  BASE_REF="${BASE_REF:-main}"
fi

echo "OpenMAIC upstream compatibility check"
echo "base ref: ${BASE_REF}"
echo "upstream ref: ${UPSTREAM_REF}"
echo

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: current directory is not a git repository" >&2
  exit 2
fi

if ! git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  echo "ERROR: base ref '${BASE_REF}' does not exist" >&2
  exit 2
fi

if ! git rev-parse --verify "${UPSTREAM_REF}" >/dev/null 2>&1; then
  echo "WARN: upstream ref '${UPSTREAM_REF}' does not exist."
  echo "      Add the official OpenMAIC remote or set UPSTREAM_REF before running a full check."
  echo
  echo "Local files changed since ${BASE_REF}:"
  {
    git diff --name-only "${BASE_REF}...HEAD"
    git diff --name-only
    git diff --cached --name-only
  } | sort -u | awk '
    { print "  " $0; count++ }
    END { if (count == 0) print "  (none)" }
  '
  exit 0
fi

MERGE_BASE="$(git merge-base "${BASE_REF}" "${UPSTREAM_REF}")"
LOCAL_CHANGED="$(mktemp)"
UPSTREAM_CHANGED="$(mktemp)"
CORE_CHANGED="$(mktemp)"
CONFLICT_CANDIDATES="$(mktemp)"
trap 'rm -f "${LOCAL_CHANGED}" "${UPSTREAM_CHANGED}" "${CORE_CHANGED}" "${CONFLICT_CANDIDATES}"' EXIT

{
  git diff --name-only "${BASE_REF}...HEAD"
  git diff --name-only
  git diff --cached --name-only
} | sort -u >"${LOCAL_CHANGED}"
git diff --name-only "${MERGE_BASE}..${UPSTREAM_REF}" | sort >"${UPSTREAM_CHANGED}"

comm -12 "${LOCAL_CHANGED}" "${UPSTREAM_CHANGED}" >"${CONFLICT_CANDIDATES}"

awk '
  function isolated(path) {
    return path ~ /^app\/\(teacher\)\/teacher\// ||
      path ~ /^app\/api\/teacher\// ||
      path ~ /^app\/join\// ||
      path ~ /^components\/teacher\// ||
      path ~ /^lib\/teacher\// ||
      path == "configs/feature-flags.ts"
  }

  function minimal(path) {
    return path == "middleware.ts" ||
      path ~ /^components\/sidebar\// ||
      path == ".env.example"
  }

  {
    if (!isolated($0) && !minimal($0)) print $0
  }
' "${LOCAL_CHANGED}" >"${CORE_CHANGED}"

echo "Changed files outside the teacher isolation boundary:"
if [[ -s "${CORE_CHANGED}" ]]; then
  sed 's/^/  /' "${CORE_CHANGED}"
else
  echo "  (none)"
fi
echo

echo "Files changed both locally and in ${UPSTREAM_REF}:"
if [[ -s "${CONFLICT_CANDIDATES}" ]]; then
  sed 's/^/  /' "${CONFLICT_CANDIDATES}"
  echo
  echo "RESULT: review required before merging upstream updates."
  exit 1
fi

echo "  (none)"
echo
echo "RESULT: no direct upstream conflict candidates detected."
