#!/bin/sh
npm cache clean
sudo npm i -g pm2
sudo npm i -g grunt-cli
sudo npm i -g fibers
npm i fibers
npm install
grunt prepare
