#!/bin/sh
# Installs the real package tarball into .smoke, the way a consumer would get it.
set -e
rm -rf .smoke
mkdir .smoke
npm pack --silent --pack-destination .smoke > /dev/null
cp smoke/smoke.cjs smoke/smoke.mjs .smoke/
cd .smoke
echo '{"private":true}' > package.json
npm install --no-audit --no-fund --no-package-lock ./*.tgz > /dev/null
