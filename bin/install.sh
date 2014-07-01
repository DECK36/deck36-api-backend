#!/bin/sh
npm cache clean
sudo npm i -g pm2
sudo npm i -g grunt-cli
npm install
grunt prepare