#!/bin/sh
npm cache clean
sudo npm install -g nodemon
sudo npm install -g sardines
grunt prepare
