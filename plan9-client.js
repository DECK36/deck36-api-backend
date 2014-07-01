/**
 * Declares the plan9-client.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2014 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var NODE_MODULES_PATH = '/usr/local/lib/node_modules/';
var PORT = 3001;
var HOST = 'http://localhost';
var PATH = '/data';
var MSG = 'badge';
var DATA = {"user":{"user_socket_id":1, "user_id":1},"type":"badge","badge":{"name":"High Five!", "color":"red", "size":"50px"}, "point":{"increment":20},"action":{"type":"unsolve","amount":5}};

var port = parseInt(process.argv[2]) || PORT;
var path = process.argv[3] || PATH;
var message = process.argv[4] || MSG;
var data = process.argv[4] || DATA;

var cbtmessage = {"type":"cbt", "user": {"user_id":1},"timestamp":"123456789101","version":0.9,"cbt": {"solved":"true", "coordinate":[150,8], "entity_coordinate": [140,50]}};
var pointsmessage = {"type":"points", "user_src": {"user_id":1}, "user_target": {"user_socket_id":1, "user_id":1},"timestamp":"123456789101","version":0.9,"points": {"total":3293, "increment":20}};

console.log('client connects to port ' + port);

var config = require('config')
    , redis = require('redis')
    , logger = require('./lib/modules').logger
    , redisClient = redis.createClient(config.redis.port, config.redis.host, config.redis.options)
    , connector = require('./lib/server/connectors/' + config.server.connector)
    , async = require('async');

logger.logLevel = 'DEBUG';
var io = require('socket.io-client');
var socket = io.connect(HOST + ':' + port + path, {
    /* Pass the authentication token as a URL parameter */
    query: 'userId=1'});
var CbtCalcuclator = require('./lib/game/cbtcalculator');
var cbtcalculator = new CbtCalcuclator(redisClient);

socket.on('connect', function () {

    // wait for messages
    socket.on('command', function(data) {
        console.log('new message received', JSON.stringify(data));
    });
});

// send cbt message to server
/*connector.setExchangeName('plan9');
connector.setQueueName('plan9');
connector.connect(config, function(err, connectionHandler) {
    if (!err) {

        setTimeout(function(){connector.disconnect();}, 1500);

        connector.send(connectionHandler, new Buffer(JSON.stringify(cbtmessage)), config, function(err) {
            if (!err) {
                console.log('send cbt message');
            } else {
                console.log('error sending cbt message: ' + JSON.stringify(err));
            }
        }, 'cbt.plan9');

        connector.send(connectionHandler, new Buffer(JSON.stringify(pointsmessage)), config, function(err) {
            if (!err) {
                console.log('send points message');
            } else {
                console.log('error sending points message: ' + JSON.stringify(err));
            }
        }, 'points.plan9');
    } else {
        console.log('amqp connection error: ' + err);
    }
});*/
