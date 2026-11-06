#!/usr/bin/env bash
# Publish the rooms to vps1.markmeijerman.nl, where nginx serves them as
# https://escape.markmeijerman.nl/. Plain files in a directory: no container, no
# PHP, no database.
#   ./deploy.sh            build and push
#   ./deploy.sh --dry-run  build into $TMPDIR only, push nothing
#   ./deploy.sh --check    push, then curl the live URL and print what answers
set -euo pipefail
cd "$(dirname "$0")"

HOST="${HOST:-deploy@vps1.markmeijerman.nl}"
ROOT="${ROOT:-/home/websites/escape}"
URL="${URL:-https://escape.markmeijerman.nl/}"
OUT="${TMPDIR:-/tmp}/escaperoom-site"
# CI has a key file and a pinned known_hosts instead of an agent, so the ssh
# command is a variable. Nothing else about the push changes.
SSH_CMD="${SSH_CMD:-ssh -o BatchMode=yes}"

rm -rf "$OUT"; mkdir -p "$OUT"
cp pcdoc.html murdoku.html hogwarts.html edo.html classic.html "$OUT/"
cp -r vendor "$OUT/"
cp -r murdoku "$OUT/"                  # the engine in murdoku.html, one file per room in murdoku/levels/
cp PLAY.md PC-DOCTOR.md MURDOKU.md README.md "$OUT/"
cp index.html "$OUT/study.html"          # the Locked Study keeps its room, not the root
cp site/index.html site/favicon.svg "$OUT/"

echo "built $OUT ($(du -sh "$OUT" | cut -f1))"
if [ "${1:-}" = "--dry-run" ]; then
  echo "dry run: nothing pushed to $HOST:$ROOT"
  exit 0
fi

# A remote empty of everything, so the paths below cannot be pointed anywhere
# worse by a stray environment variable.
case "$ROOT" in
  /*/escape) ;;
  *) echo "refusing to deploy into ROOT='$ROOT'" >&2; exit 1 ;;
esac

# The deploy account owns that directory (see vps1-provisioning, webserver role);
# nothing outside it is touched. -z because the vendor tree is a few hundred KB
# of JavaScript that compresses well, and the delete keeps the box a mirror of
# this build instead of a pile of rooms that no longer exist. The trailing
# slashes matter: copy the contents of the directory, not the directory.
if command -v rsync >/dev/null 2>&1; then
  rsync -rz --delete --chmod=D755,F644 -e "$SSH_CMD" "$OUT/" "$HOST:$ROOT/"
else
  # No rsync on this machine (CI has it; a bare laptop often does not). Same
  # result in one pass: empty the directory, then untar the build into it.
  tar -czf - -C "$OUT" . | $SSH_CMD "$HOST" "rm -rf '$ROOT'/* && tar -xzf - -C '$ROOT'"
fi

echo "pushed to $HOST:$ROOT"

if [ "${1:-}" = "--check" ]; then
  code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 -L "$URL" || true)"
  echo "$URL -> $code"
  [ "$code" = "200" ] || { echo "not live yet: is DNS pointing here and has make provision-prod run?" >&2; exit 1; }
fi

echo "live at $URL"
