/**
 * Declares the logger.js class.
 *
 * It is a wrapper for the log4javascript class to be used via require and configured only once.
 * log4javascript and clientconfig has to be included in the project (see Gruntfile.js - browserify section)
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
function Logger() {
    this.logger = null;

    this.loggerEnabled = true;

    this.logLevel = 'ERROR';

    this.getLogger = function() {
        if (!this.logger) {
            if (typeof window != "undefined") {
                require('log4javascript');
                var appender;

                /**
                 * ClientConfig is a JSON notation.
                 *
                 * @see: https://github.com/DECK36/deck36-iojs-devsuite/config/client/default.js
                 */
                this.loggerEnabled = typeof clientconfig.logger.enabled != "undefined" ? clientconfig.logger.enabled : false;
                var appenderName = typeof clientconfig.logger.appender != "undefined" ? clientconfig.logger.appender : 'BrowserConsoleAppender';
                this.logLevel = typeof clientconfig.logger.level != "undefined" ? clientconfig.logger.level : 'ERROR';

                log4javascript.setEnabled(this.loggerEnabled);
                if (log4javascript.hasOwnProperty(appenderName)) {
                    appender = new log4javascript[appenderName];
                } else {
                    appender = new log4javascript.BrowserConsoleAppender();
                }

                this.logger = log4javascript.getLogger("deck36-iojs");
                this.logger.removeAllAppenders();
                this.logger.setLevel(log4javascript.Level[this.logLevel]);
                this.logger.addAppender(appender);
            } else {
                // According to the log4javascript API we have to make debug() and fatal() available for console if log4js is
                // not available
                console.debug = function(arguments) {
                    this.log(arguments);
                };
                console.fatal = function(arguments) {
                    this.log(arguments);
                };
                this.logger = console;
            }
        }

        return this.logger;
    };

    this.trace = function(message, object) {
        this._log(message, object, 'trace');
    };

    this.debug = function(message, object) {
        this._log(message, object, 'debug');
    };

    this.info = function(message, object) {
        this._log(message, object, 'info');
    };

    this.warn = function(message, object) {
        this._log(message, object, 'warn');
    };

    this.error = function(message, object) {
        this._log(message, object, 'error');
    };

    this.fatal = function(message, object) {
        this._log(message, object, 'fatal');
    };

    this._log = function(message, object, severity) {
        if (false == this.loggerEnabled) {
            return;
        }

        object = typeof object == 'undefined' ? {} : object;
        message = typeof message == 'undefined' ? '' : message;
        severity = typeof severity == 'undefined' ? 'error' : severity;
        var logger = this.getLogger();
        if (typeof logger[severity] != "undefined") {
            if (this.logLevel.toLowerCase() == severity) {
                var logMessage = message + ' : ' + JSON.stringify(object);
                logger[severity](logMessage);
            }
        } else {
            throw 'Severity ' + severity + ' does not exist for the current logger.';
        }
    };
}



module.exports = new Logger();