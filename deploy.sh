#!/usr/bin/env bash
# Publish the rooms to GitHub Pages (branch: gh-pages).
#   ./deploy.sh            build and push
#   ./deploy.sh --dry-run  build into $TMPDIR only, push nothing
set -euo pipefail
cd "$(dirname "$0")"
REPO="$(git config --get remote.origin.url)"
OUT="${TMPDIR:-/tmp}/escaperoom-site"

rm -rf "$OUT"; mkdir -p "$OUT"
cp pcdoc.html hogwarts.html edo.html classic.html "$OUT/"
cp -r vendor "$OUT/"
cp PLAY.md PC-DOCTOR.md README.md "$OUT/"
cp index.html "$OUT/study.html"          # the Locked Study keeps its room, not the root
cp site/index.html site/favicon.svg "$OUT/"
touch "$OUT/.nojekyll"

echo "built $OUT ($(du -sh "$OUT" | cut -f1))"
[ "${1:-}" = "--dry-run" ] && exit 0

cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-Mark Meijerman}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-markmeijerman@hotmail.com}" \
    commit -qm "chore: publish $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git remote add origin "$REPO"
git push -q origin gh-pages --force
echo "pushed gh-pages — https://mjmeijerman.github.io/escaperoom/"
