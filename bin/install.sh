#!/bin/sh
npm cache clean
sudo npm i -g --unsafe-perm pm2
sudo npm i -g grunt-cli
sudo npm i -g fibers
sudo npm i -g nodemon
sudo npm i -g sardines
npm i fibers
npm install
grunt prepare
