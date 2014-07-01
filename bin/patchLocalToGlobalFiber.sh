#!/bin/bash

GLOBAL_FIBERS_DIR=/usr/local/lib/node_modules/fibers

if [ -z "$1" ] 
  then
    echo "Usage: $0 <file_to_patch> [optional: <global_fibers_dir>]"
    echo "Default global fibers directory is: " $GLOBAL_FIBERS_DIR
    exit 1;
fi

if [ ! -z "$2"  ] 
  then
    GLOBAL_FIBERS_DIR=$2
fi

echo "Patching $1 to use fibers from" $GLOBAL_FIBERS_DIR	

sed -e 's#var modPath = path.join(__dirname#var modPath = path.join("'$GLOBAL_FIBERS_DIR'"#g' < $1 > $1.patch

mv $1.patch $1

