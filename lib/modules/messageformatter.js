/**
 * Declares the messageformatter.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & CO. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
var exceptions = require('./exceptions')
    , logger = require('./logger')
    , uuidCreator = require('node-uuid');
/**
 * Formats a given message
 *
 * @constructor
 */
function MessageFormatter()
{
    /**
     * @type {int}
     * @private
     */
    this._pulseIdentifier = uuidCreator.v1() || +new Date();

    /**
     * @type {unifiedmessageformat}
     * @private
     */
    this._umf = null;

    /**
     *
     * @type {string}
     * @private
     */
    this._defaultOrgId = "11111111-1111-1111-1111-111111111111";

    /**
     * Used to create a message from a StorageResult.
     *
     * @param {storageresult} result
     * @param {string} handle Identifier for the message
     * @param {string} orgId Identifier for the organization
     * @param {object} optionalFields
     *
     * @return {unifiedmessageformat}
     */
    this.createUnifiedMessageFromStorageResult = function (result, handle, orgId, optionalFields)
    {
        if (typeof result == "undefined" || typeof result.getResult == "undefined") {
            throw new exceptions.ParameterException('You have to give give a storageresult.');
        }
        if (typeof handle == "undefined") {
            throw new exceptions.ParameterException('You have to set the handle string.');
        }
        logger.debug('messageformatter - createUnifiedMessageFromStorageResult - result = ' ,result.getResult());
        var umf = this.getUmf();
        logger.debug('messageformatter - createUnifiedMessageFromStorageResult - umf = ' , umf);
        umf.request_id.value = this.getPulse();
        umf.timestamp.value = +new Date(); //cast current Date to number = timestamp in ms
        umf.handle.value = handle;
        umf.organisation.value.org_id = orgId || this._defaultOrgId;

        var storageResult = result.getResult();
        for(var key in storageResult) {
            logger.debug('messageformatter - createUnifiedMessageFromStorageResult - key in result = ' + key);
            if(storageResult.hasOwnProperty(key)) {
                logger.debug(
                    'messageformatter - createUnifiedMessageFromStorageResult - storageResult.hasOwnProperty(key) = '
                        + storageResult.hasOwnProperty(key)
                );
                var bodyContentContainer = {};
                bodyContentContainer.key =  key;
                bodyContentContainer.value = storageResult[key];
                logger.debug('messageformatter - createUnifiedMessageFromStorageResult - bodyContentContainer = ',bodyContentContainer);
                umf.body.value.push(bodyContentContainer);
                logger.debug('messageformatter - createUnifiedMessageFromStorageResult - umf.body.value = ', umf.body.value);
            }
        }

        optionalFields = typeof optionalFields != "undefined" ? optionalFields : {};
        for (var property in optionalFields) {
            if (optionalFields.hasOwnProperty(property) && umf.hasOwnProperty(property)
                && typeof optionalFields[property] != "undefined") {
                umf[property].value = optionalFields[property];
            }
        }

        // remove unnecessary fields to minimize stored and send data
        for (var field in umf) {
            if (umf.hasOwnProperty(field)) {
                var tmpValue = umf[field].value;
                delete umf[field].optional;
                delete umf[field].sanitize;
                delete umf[field].value;
                umf[field] = tmpValue;
            }
        }

        return umf;
    };

    /**
     * @param {Object} unifiedMessageFormat
     */
    this.setUmf = function(unifiedMessageFormat) {
        this._umf = unifiedMessageFormat;
    };

    /**
     * @return {unifiedmessageformat}
     */
    this.getUmf = function() {
        if (null === this._umf) {
            this._umf = require('../unifiedmessageformat');
        }
        logger.debug('messageformatter - getUmf - umf = ', this._umf);
        // "clone" the umf object
        return JSON.parse(JSON.stringify(this._umf));
    };

    /**
     * set pulse id
     * @param pulse
     */
    this.setPulse = function (pulse) {
        this._pulseIdentifier = pulse;
    };

    /**
     * Looks up PULSEID or generates one
     *
     * @private
     * @return pulseId
     */
    this.getPulse = function () {
        return this._pulseIdentifier;
    };

    /**
     * @param message
     * @return boolean
     */
    this.sanitizeMessage = function (message) {
        if (typeof message == "undefined" || !message) {
            throw exceptions.ParameterException("the message has to be set");
        }

        var result = false;
        var umf = this.getUmf();
        // write the message's values into the umf to make it sanitizable and if not existing, return false
        for (var field in message) {
            if (message.hasOwnProperty(field) && umf.hasOwnProperty(field)) {
                umf[field].value = message[field];
            } else {
                umf = {};
                result = false;
            }
        }

        for (var property in umf) {
            if (umf.hasOwnProperty(property)) {

                //sanitize value is set if needs too
                if (false == umf[property].optional
                    && (typeof umf[property].value == "undefined"
                    || typeof umf[property].value == null
                    || umf[property].value == ''
                    )
                    ) {
                    logger.error('messageformatter - needed value for property: ' + property + ' is not set: ' + umf[property].value);
                    result = false;
                    break;
                }

                //sanitize the type
                logger.debug('messageformatter - sanitizeMessage - property = ' +
                                 property + ' = ' ,umf[property]);
                if (typeof umf[property].value !== umf[property].sanitize.type) {
                    result = false;
                    break;
                }

                //sanitize against regExpression
                if (umf[property].sanitize.regEx != null) {
                    var stringifiedValue = umf[property].value + '';
                    var re = new RegExp(umf[property].sanitize.regEx);
                    if (typeof stringifiedValue.match == "undefined" || !stringifiedValue.match(re)) {
                        result = false;
                        break;
                    } else {
                        result = true;
                    }
                } else {
                    result = true;
                }
            }
        }

        return result;
    };
}

module.exports = new MessageFormatter();
