#!/bin/sh
# npm installs the wrong "zeppos-app-utils" (a placeholder from the npm
# registry). zeus-cli actually needs the full version it bundles at
# @zeppos/zeus-cli/private-modules/zeppos-app-utils. Copy it over.
set -e
SRC="node_modules/@zeppos/zeus-cli/private-modules/zeppos-app-utils"
DST="node_modules/zeppos-app-utils"
if [ -d "$SRC" ]; then
  rm -rf "$DST"
  cp -r "$SRC" "$DST"
fi
