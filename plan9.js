var config = require('config')
    , httpServer = require('http')
    , app = require('./lib/server/app.js')
    , twig = require('twig').twig
    , socketIoAuthorization = require('./lib/server/socketio.js').socketIoAuthorization
    , fs = require('fs')
    , logger = require('./lib/modules').logger
    , async = require('async')
    , io = {}
    , connector = require('./lib/server/connectors/' + config.server.connector)
    , server = {}
    , messageformatter = require('./lib/modules').messageFormatter
    , highscoresTemplate
    , badgeTemplate
    , redisClient
    , CbtCalcuclator = require('./lib/game/cbtcalculator')
    , cbtcalculator
    , socketIoRedisClient = require('socket.io-redis')
    , CbtMessageCreator = require('./lib/game/cbt-message-creator')
    , PlaygroundSolvedMessageCreator = require('./lib/game/playground-solved-message-creator')
    , UpdateOverviewMessageCreator = require('./lib/game/update-overview-message-creator')
    , controllers = require('./lib/controllers');

logger.logLevel = 'DEBUG';
///////////////////////////////
//
// Bootstrapping app
// Starting server and sockets
//
////////////////////////////////
async.series([
    function(callback){
        server = httpServer.createServer(app);
        io = require('socket.io')(server, {
            'match origin protocol': true,
            'serveClient': false,
            'transports': ['websocket', 'xhr-polling', 'polling']

        });
        io.adapter(socketIoRedisClient({host: config.redis.host, port: config.redis.port}));

        process.nextTick(function() {callback(null); });
    },
    function(callback){
        async.parallel([
            //connect to Redis
            function(callback) {
                redisClient = app.redisClient;
                redisClient.on('connect', function() {
                    logger.debug('Redis connection is ready to use.');
                });

                redisClient.on('error', function(err) {
                    logger.error('Redis connection error! Error thrown: ' + err);
                });

                cbtcalculator = new CbtCalcuclator(redisClient);
                process.nextTick(function() {callback(null)});
            },
            function(callback) {
                // startServer
                server.listen(config.server.port, config.server.host);
                process.nextTick(function() {callback(null)});
            },
            function(callback){
                ///////////////////////////////
                // Routes and templates
                ////////////////////////////////
                app.get('/connect', controllers.indexController().connectAction);

                highscoresTemplate = twig({
                    id:'highscores',
                    path: __dirname + '/lib/server/views/highscores.html.twig'
                });

                badgeTemplate = twig({
                  id:'badge',
                  path: __dirname + '/lib/server/views/badge.html.twig'
                });

                process.nextTick(function() {callback(null)});
            }
        ], function() {
            process.nextTick(function() {callback(null)});
        });
    }
],
function(err){
    if (!err) {
        async.waterfall([
            function(callback) {
                ///////////////////////////////
                // Setup excahnges and queues
                ////////////////////////////////
                connector.setExchangeName('plan9');
                connector.setQueueName('plan9');
                connector.connect(config, function(err, connectionHandler) {
                    if (err) {
                        process.nextTick(function() {throw 'error within amqp connection happend ' + err});
                    } else {
                        console.log('Connected to connector: ' + config.server.connector);
                        process.nextTick(function() {callback(null, connectionHandler); });
                    }
                }, function(message) {
                    logger.debug('RECEIVEDNEWMESSAGE');
                    var rawMessageObj = message.data.toString();
                    logger.debug(rawMessageObj);
                    var messageObj = JSON.parse(rawMessageObj);

                    if (messageObj.hasOwnProperty('user')
                        && messageObj.user.hasOwnProperty('user_id')
                        && messageObj.hasOwnProperty('type')
                        && messageObj.type == 'badge') {
                        //redisClient.publish('badge', rawMessageObj);
                        redisClient.HINCRBY('user_' + messageObj.user.user_id, 'points', parseInt(messageObj.points.increment), function(err, result) {
                            logger.debug('Incremented points by HINCRBY from badge message err: ', err);
                            logger.debug('Incremented points by HINCRBY from badge message result: ', result);
                        });

                        redisClient.HGET('user_' + messageObj.user.user_id , 'user_socket_id', function(err, result) {
                            logger.debug('Fetching user_socket_id by HGET err: ', err);
                            logger.debug('Fetching user_socket_id by HGET result: ', result);
                            if (!err && null != result) {
                                var socketId = result.toString();
                                logger.debug('User socket id: ', socketId);
                                console.log(io.of('/playground'));
                                io.of('/playground').connected[socketId].volatile.emit(
                                    //socket.emit(
                                    'command', {
                                        payload: twig({
                                                          ref: 'badge',
                                                          async: false
                                                      }).render({
                                                                    badge: messageObj.badge
                                                                }),
                                        commandtype: 'showBadge'
                                    }
                                );
                            } else {
                                logger.error('Cannot send badge to user: ' + user_id + ', because user_id => user_socket_id cannot be found');
                            }
                        });
                    } else {
                        logger.debug('This message is not supported. It does not contain a user_id or the correct type', messageObj);
                    }
                });
            },
            function(connectionHandler, callback) {
                ///////////////////////////////
                // socket io namespaces
                ////////////////////////////////
                io.of('/overview').on('connection', function(socket) {
                    console.log('connected to overview socket by id: ' + socket.id);
                });

                io.of('/playground').use(socketIoAuthorization).on('connection', function (socket) {
                    console.log('connected to playground socket by id: ' + socket.id);
                    logger.debug('storing socketid for user: ' + socket.uuid);
                    // @todo: currently it is sent via socket connect. Should be received via session (security issue)
                    var userId = socket.uuid;
                    logger.debug('UserId = ' + userId);
                    // store user_id to socket_id
                    redisClient.HSET('user_' + userId, 'user_socket_id', socket.id, function(err, result) {
                        logger.debug('Stored socket_id to user_id err: ', err);
                        logger.debug('Stored socket_id to user_id result: ', result);
                    });

                    // @todo: Points have to be sent by socket connection from client (if avaiable)
                    redisClient.HSET('user_' + userId, 'points', 0, function(err, result) {
                        logger.debug('Stored points to user_id err: ', err);
                        logger.debug('Stored points to user_id result: ', result);
                    });

                    // send new cbt
                    sendCbtToUser(userId, socket, function(received) {
                        if (received) {
                            logger.debug('Cool. Client received the cbt');
                        }
                    });

                    socket.on('disconnect', function() {
                        cbtcalculator.removePixelsFromLocksForUser(userId, function(err) {
                            logger.debug(err);
                        })
                    });

                    // Fetch cbts
                    socket.on('logdata', function (data)
                    {
                          logger.debug('Receiving CBT from client');
                          async.waterfall([
                              //sanitize
                              function(callback) {
                                  try {
                                      var messages = JSON.parse(data).messages;
                                      var cbtSolution = messages.body[0].value[0].payload;
                                      logger.debug('CBT solution = ', cbtSolution);
                                      process.nextTick(function() { callback(null, cbtSolution); });
                                  } catch(e) {
                                      process.nextTick(function() { callback("Sanitization exception with error: " +  e); });
                                  }
                              },
                              function(cbtSolution, callback) {
                                logger.debug('Calculating points and cbt.');
                                async.waterfall([
                                    function(callback) {
                                        var pointsIncrement = 0;

                                        // calculate points
                                        cbtcalculator.cbtHasBeenSolvedCorrectly(cbtSolution.cbt, function(err, isSolved, pixelResult){
                                            if (!err) {
                                                logger.debug('Calculate Points increment based on isSolved: ' + isSolved);
                                                if (true == isSolved) {
                                                    pointsIncrement = 1;
                                                } else {
                                                    pointsIncrement = -1;
                                                }
                                                logger.debug('Points increment isset to: ' + pointsIncrement);
                                                process.nextTick(function() {callback(null, pointsIncrement, pixelResult, isSolved)});
                                            } else {
                                                process.nextTick(function() {callback(err)});
                                            }
                                         })
                                    },
                                    function(pointsIncrement, pixelResult, isSolved, callback) {
                                        async.parallel([
                                            function(callback) {
                                                async.waterfall([
                                                    function(callback) {
                                                        var totalPoints = 0;
                                                        var multi = redisClient.multi();

                                                        multi.HINCRBY('user_' + userId, 'points', pointsIncrement);
                                                        // @todo: this should be a user name
                                                        multi.ZINCRBY('plan9_highscores', userId, pointsIncrement);
                                                        multi.EXEC(function(err, result) {
                                                            logger.debug('Incremented points by MULTI: ', err);
                                                            logger.debug('Incremented points by MULTI: ', result);
                                                            if (!err) {
                                                                totalPoints = result[0];
                                                                process.nextTick(function() {callback(null, pointsIncrement, totalPoints)});
                                                            } else {
                                                                process.nextTick(function() {callback(err)});
                                                            }
                                                        });
                                                    },
                                                    function(pointsIncrement, totalPoints, callback) {
                                                        var pointsMessage = {
                                                            type: "points",
                                                            user_src: {
                                                                user_id: userId
                                                            },
                                                            user_target: {
                                                                user_id: userId
                                                            },
                                                            timestamp: cbtSolution.timestamp,
                                                            version: cbtSolution.version,
                                                            points: {
                                                                total: totalPoints,
                                                                increment: pointsIncrement
                                                            }
                                                        };
                                                        logger.debug('Points message to send: ', pointsMessage);
                                                        connector.send(connectionHandler, new Buffer(JSON.stringify(pointsMessage)), config, function(err) {
                                                            logger.debug('SENDING points to amqp.' + err);
                                                            if (!err) {

                                                                socket.volatile.emit('command', {
                                                                    payload: totalPoints,
                                                                    commandtype: 'updatePoints'
                                                                });

                                                                process.nextTick(function() {callback(null); });
                                                            } else {
                                                                process.nextTick(function() {callback(err); });
                                                            }
                                                        }, 'points.plan9');
                                                    }
                                                ], function(err) {
                                                    logger.debug('Points area error?: ', err);
                                                    process.nextTick(function() {callback(err); });
                                                });
                                            },
                                            function(callback) {
                                                var cbtMessage = new CbtMessageCreator(cbtSolution, userId, isSolved, pixelResult).createMessage();

                                                logger.debug('CBT message to send: ', cbtMessage);
                                                connector.send(connectionHandler, new Buffer(JSON.stringify(cbtMessage)), config, function(err) {
                                                    if (!err) {
                                                        var playGroundSolvedMessage = new PlaygroundSolvedMessageCreator(isSolved, pixelResult).createMessage();
                                                        logger.debug('Playground solved message to send: ', playGroundSolvedMessage);
                                                        socket.volatile.emit('command', playGroundSolvedMessage);

                                                        var updateOverviewMessage = new UpdateOverviewMessageCreator(pixelResult, twig).createMessage();
                                                        logger.debug('Update Overview message to send: ', updateOverviewMessage);
                                                        // send to connected overview pages
                                                        io.of('/overview').emit('command', updateOverviewMessage);

                                                        process.nextTick(function() {callback(null); });
                                                    } else {
                                                        process.nextTick(function() {callback(err); });
                                                    }
                                                }, 'cbt.plan9');
                                            },
                                            function(callback) {
                                                logger.debug('decide what to do with given solution.');
                                                if (isSolved) {
                                                    cbtcalculator.setPixelToSolved(userId, pixelResult.pixel, function(err) {
                                                        process.nextTick(function() {callback(err)});
                                                    });
                                                } else {
                                                    process.nextTick(function() {callback(null); });
                                                }
                                            }
                                        ], function(err) {
                                            logger.debug('Result of sending points and cbt messages to backend.', err);
                                            process.nextTick(function() {callback(err); });
                                        });
                                    }
                                ], function(err) {
                                    logger.error('Error in sending points message: ' + err);
                                    process.nextTick(function() {callback(null);});
                                });
                              },
                              function(callback) {
                                  cbtcalculator.getCbtForUser(userId, function(err, cbt) {
                                      if (!err && cbt) {
                                          logger.debug('NOW Sending new cbt to user: ' + userId);
                                          socket.emit('command', {
                                              commandtype: 'setPlaygroundCbt',
                                              payload: cbt
                                          },function(received) {
                                              if (received) {
                                                  logger.debug('NEW Cbt has been ack by client!');
                                                  process.nextTick(function() {callback(null, cbt)});
                                              }
                                          });
                                      } else {
                                          logger.debug('ERROR in sending new cbt to user: ', err);
                                          process.nextTick(function() {callback(err)});
                                      }
                                  });
                              },
                              function(cbt, callback) {
                                  redisClient.zrevrange('plan9_highscores','0','9', 'withscores', function(err, highscores) {
                                      logger.debug('Getting highscores by zrevrange: ' + err);
                                      logger.debug('Getting highscores by zrevrange: ' + highscores);
                                      if (!err && highscores) {
                                          logger.debug('Highscore is filled: ' + highscores);
                                          var parsedHighscores = [];


                                          for (var highscoreIndex in highscores) {
                                              if (highscores.hasOwnProperty(highscoreIndex)) {
                                                  try {
                                                      logger.debug('PARSED highscore: ' + JSON.parse(highscores[highscoreIndex].toString()));
                                                      parsedHighscores.push(JSON.parse(highscores[highscoreIndex].toString()));

                                                  } catch(e) {
                                                      logger.debug('ERROR in parsing Highscore.');
                                                  }
                                              }
                                          }

                                          var highscoreMarkup = twig({
                                                                       ref: 'highscores',
                                                                       async: false
                                                                     }).render({
                                                                        highscores: parsedHighscores
                                                                     });

                                          logger.debug('highscore markup', highscoreMarkup);
                                          socket.volatile.emit('command', {
                                              commandtype: 'updateHighScore',
                                              payload: highscoreMarkup
                                          });
                                      } else {
                                          if (!err) {
                                              err = 'Highscores List is empty';
                                          }
                                          process.nextTick(function() {callback(err)});
                                      }
                                  });
                              }
                          ], function(err) {
                              if (err) {
                                  process.nextTick(function() {callback("Error in on connection async.waterfall: " + err); });
                              }
                          });
                    });
                });
                process.nextTick(function() {callback(null); });
            }
        ], function (err) {
            if (err) {
                logger.error("Error of async.waterfall in end function after start series: " + err);
            } else  {
                logger.info('Started data collector backend server.');
            }
        })
    } else {
        if (err) {
            logger.error("Error in async.series: " + err);
        }
    }
});


function sendCbtToUser(userId, socket, callback) {
    // create and send new cbt for user
    cbtcalculator.getCbtForUser(userId, function(err, cbt) {
        if (!err && cbt) {
            logger.debug('NOW Sending new cbt to user: ' + userId);
            socket.emit('command', {
                commandtype: 'setPlaygroundCbt',
                payload: cbt
            },callback);

        } else {
            logger.debug('ERROR in sending new cbt to user: ', err);
        }
    });
}