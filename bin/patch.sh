#!/bin/bash
FILES=`pwd`/build/patches/*.patch
for f in $FILES
do
  echo "Execute patch $f"
  pwd && patch -p1 < $f
done