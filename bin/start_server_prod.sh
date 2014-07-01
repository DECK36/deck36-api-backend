#!/bin/bash
set -x
FILETOSTART = 'plan9.js';
while test $# -gt 0; do
    case "$1" in
        --file)
            FILETOSTART=$2;
            break;
            ;;
        *)
            break;
    esac
done

NPROCREDUCED=1;
export NODE_ENV=prod;
export NODE_CONFIG_DIR=config;
pm2 -i $NPROCREDUCED -o /var/log/nodejs/plan9-"$FILETOSTART"_out.log -e /var/log/nodejs/plan9-"$FILETOSTART"_error.log start
`pwd`/$FILETOSTART;