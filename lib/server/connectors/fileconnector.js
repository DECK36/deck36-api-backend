/**
 * Declares the fileconnector class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var fs = require('fs')
    , async = require('async');

function FileConnector(fs) {

    /**
     * @param {fs.writeStream} writeStream
     * @param {Buffer} message
     * @param {object} config
     * @param {function} callback
     */
    this.send = function(writeStream, message, config, callback) {
        writeStream.end(message, 'utf-8');

        writeStream.on('finish', function() {
            callback(null);
        });

        writeStream.on('error', function(err) {
            callback(err);
        });
    };

    /**
     * Due to the amqp connector interface, this has to be available.
     * @todo: milo - 30122013 - refactor interface
     *
     * @param {string} exchangeName
     */
    this.setExchangeName = function(exchangeName) {
        this.exchangeName = exchangeName;
    };

    /**
     * Due to the amqp connector interface, this has to be available.
     * @todo: milo - 30122013 - refactor interface
     *
     * @param {string} queueName
     */
    this.setQueueName = function(queueName) {
        this.queueName = queueName;
    };

    this.on = function () {

    };

    /**
     * @param {object} config
     * @param {function} connectCallback
     */
    this.connect = function(config, connectCallback) {
        var filePath = config.connectors.file.filename;
        var fileFlags = config.connectors.file.flags || 'w+';
        var fileMode = config.connectors.file.mode || '0755';
        console.log(filePath);
        async.series({
            rename: function(callback) {
                fs.exists(filePath, function (exists) {
                    if (exists) {
                        fs.rename(filePath, filePath + '_' + (+new Date()), function (err) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null);
                            }

                        });
                    } else {
                        callback(null);
                    }
                });
            },
            createstream: function(callback) {
                try {
                    var writeStream = fs.createWriteStream(
                        filePath, {
                            flags: fileFlags,
                            mode: fileMode
                        });
                    callback(null, writeStream);
                } catch (e) {
                    callback(e);
                }
            }
        }, function(err, result) {
            if (err) {
                throw err;
            }
            connectCallback(null, result['createstream']);
        });
    }
}

module.exports = new FileConnector(fs);