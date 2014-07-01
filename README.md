Plan9 from outer kitten api backend
===================================

[1]: https://github.com/joyent/node         "NodeJS"
[2]: https://npmjs.org/                     "npm"
[3]: https://github.com/gruntjs/grunt-cli   "grunt-cli"
[4]: https://github.com/isaacs/nave         "nave"
[5]: http://redis.io                        "redis"
[6]: https://github.com/Unitech/pm2         "pm2"
[7]: https://github.com/remy/nodemon        "nodemon"
[8]: http://www.rabbitmq.com/              "rabbitMq"
[logo]: ./deck36.png "Deck36 Logo"

![Deck36 Logo][logo]

## Introduction

This is the api backend for plan9 mmorpg.

# Installation

1. Make sure you have [nodejs][1] installed.
2. Ensure [npm][2] is installed, too.
3. Ensure you have a [redis][5] server up and running.
4. Checkout these sources.
5. Install some dependencies
```
 npm install;
 npm i -g pm2;
 npm i -g grunt-cli;
 grunt prepare;
```

OR

```
sh bin/install.sh
```

NOTE: By default the redis listening on 127.0.0.1:6379 will be used. It is recommended to have a separate redis instance for iojs. Otherwise your current data might be overwritten.

## Development & Testing
1. Install some dependencies
```
npm i -g nodemon;
npm i -g sardines;
```

OR

```
sh bin/install_dev.sh
```

### Running the dev server

To start plan9 server:
```
 grunt start-plan9-dev
```

Now you can connect to the servers by https://api.plan9-dev.deck36.de/

Please accept the https certificates.

### Running the prod server
For prod we are using pm2 to manage the servers by cluster and have monitoring and logging in place.
We start it by execution of /bin/start_server_prod.sh with according --file <server>.js parameter.

You can use grunt for that, too:
```
grunt start-plan9-prod
```

It will just execute the /bin/start_server_prod.sh.

# Node.js environment

You don't need to install all node packages globally by using [nave][4].

Just download nave.sh and put it as "nave" in your path.

You can then create and manage multiple local node.js environments:

    # get current stable
    nave use stable

    # get current latest
    nave use latest

    # use specific installed version
    nave use 0.10.26

    # show all installed node.js versions
    nave ls

    # more info
    nave help

Executing "npm install" in a nave environment will install the package(s) for the respective local node.js version, even for "global" installation. Thus, when updating to the latest "stable" version, you will have to re-install all npm packages.

## Dependencies

### Api Backend
- [Redis][5]
- [Rabbit][8]

Redis is needed for dev, test and prod.
Rabbit is needed for prod, only. In dev and test you can replace the connector to use in the config/(dev|test).yml
file.

If you want to use the backend, please install redis and rabbit.
You have to run a nginx for ssl handling if you want https support.

> server:
>   connector: amqpconnector|fileconnector