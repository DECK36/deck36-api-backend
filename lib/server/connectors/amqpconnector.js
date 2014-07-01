/**
 * Declares the amqpconnector class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var amqp = require('amqp')
    , events = require('events')
    , util = require('util');

/**
 *
 * Connect to a amqp exchange and send data to it.
 *
 * config has to be like:
 *
 * config = {
 *  connectors: {
 *      amqp: {
 *          exchanges: {
 *              test: {
 *                  routingKey: 'Key',
 *                  name: 'exchangeName',
 *                  options: {
 *                      durable: true,
 *                      ...
 *                  }
 *              }
 *          }
 *      }
 *   }
 * }
 *
 * @param {amqp} amqp
 * @param {exchangeName} exchangeName
 * @param {queueName} queueName
 *
 * @constructor
 */
function AmqpConnector(amqp, exchangeName, queueName) {

    /**
     * Constant to name the newMessageInQueueEvent.
     * @type {string}
     */
    this.NEWMESSAGEINQUEUE = "newMessageInQueueEvent";

    /**
     * @type {amqp}
     */
    this.amqp = amqp;

    /**
     * @type {string}
     */
    this.exchangeName = exchangeName ? exchangeName : null;

    /**
     * @type {string}
     */
    this.queueName = queueName ? queueName : null;

    /**
     * @type {amqpconnection}
     */
    this.amqpconnection = null;


    // Call the constructor of the inherit class to be able to emit events.
    events.EventEmitter.call(this);

    /**
     *
     * @param exchange
     * @param message
     * @param config
     * @param callback
     * @param routingKey
     */
    this.send = function(exchange, message, config, callback, routingKey) {
        var exchangesConfig = this._getExchangesConfig(config, this.exchangeName);
        console.log('exchanges Config');
        console.log(JSON.stringify(exchangesConfig));
        console.log('message to send: ' + message.toString());
        try {
            exchange.publish(
                routingKey,
                message.toString(),
                exchangesConfig.publishoptions,
                function () {
                    // Called in confirmation mode, only
                    // maybe it is what we need for logging?!
                    console.log('data has been published.');
                }
            );
            process.nextTick(function() {callback(null)});
        } catch (e) {
            console.log(e);
            process.nextTick(function() {callback(e)});
        }
    };

    /**
     * @private
     */
    this._getExchangesConfig = function(config, exchangeName) {
        if(config.connectors.amqp.exchanges.hasOwnProperty(exchangeName)) {
            return config.connectors.amqp.exchanges[exchangeName];
        } else {
            throw 'ExchangeName cannot be found in config';
        }
    };

    /**
     * @private
     */
    this._getQueuesConfig = function(config, queueName) {
        if(config.connectors.amqp.queues.hasOwnProperty(queueName)) {
            return config.connectors.amqp.queues[queueName];
        } else {
            throw 'QueueName cannot be found in config';
        }
    };

    /**
     * @param {string} exchangeName
     */
    this.setExchangeName = function(exchangeName) {
        this.exchangeName = exchangeName;
    };

    /**
     * @param {string} queueName
     */
    this.setQueueName = function(queueName) {
        this.queueName = queueName;
    };

    this.connect = function(config, callback, messageInQueueCallback) {

        this.amqpconnection = this.amqp.createConnection(config.connectors.amqp);
        this.amqpconnection.on('error', function ()
        {
            this.amqpconnection.end("closing amqp connection");
            throw 'error within amqp connection happend ';
        }.bind(this));

        this.amqpconnection.on('ready', function (err)
        {
            if (!err) {
                try {
                    var exchangesConfig = this._getExchangesConfig(config, this.exchangeName);
                    this.amqpconnection.exchange(
                        exchangesConfig.name,
                        exchangesConfig.options,
                        function (exchange)
                        {
                            process.nextTick(function() {callback(null, exchange)});
                        }
                    );

                    if (this.queueName) {
                        var queuesConfig = this._getQueuesConfig(config, this.queueName);
                        // Connect to a queue and send the data to all listeners. The first one saying "Its mine" gets it.
                        this.amqpconnection.queue(queuesConfig.name + '_' + (+new Date()), function (queue) {
                            // queue.bind(queuesConfig.exchangetobind.name, queuesConfig.exchangetobind.type);
                            queue.bind(queuesConfig.exchangetobind.name, 'routingKey');

                            queue.subscribe(queuesConfig.subscribeoptions, function(message, headers, infos) {
                                console.log('NEWMESSAGEINQUEUE');
                                process.nextTick(function() {messageInQueueCallback(message, headers, infos, function(reject, requeue) {
                                        requeue = typeof requeue != "undefined" ? requeue : false;
                                        console.log('requeue in amqpconnector: ', requeue);
                                        // PAY attention. Using this with ack: false will cause an exception. If you want to use
                                        // queue shift use ack: true.
                                        queue.shift(reject, requeue);
                                    }
                                )});

                                /*this.emit(this.NEWMESSAGEINQUEUE, message, headers, infos, function(reject, requeue) {
                                    requeue = typeof requeue != "undefined" ? requeue : false;
                                    console.log('requeue in amqpconnector: ', requeue);
                                    // PAY attention. Using this with ack: false will cause an exception. If you want to use
                                    // queue shift use ack: true.
                                    queue.shift(reject, requeue);
                                });*/
                            }.bind(this));
                        }.bind(this));
                    }
                } catch (e) {
                    process.nextTick(function() {callback('Something is wrong with your exchange or queue. Maybe the config? Error = ' + e)});
                }

            } else {
                process.nextTick(function() {callback('error in amqpconnection on ready: ' + err)});
            }
        }.bind(this));


    };

    this.disconnect = function() {
        this.amqpconnection.disconnect();
    }.bind(this)
}

// SocketConnect should emit events.
util.inherits(AmqpConnector, events.EventEmitter);

module.exports = new AmqpConnector(amqp);