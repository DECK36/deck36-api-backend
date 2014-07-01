/**
 * Declares the UnifiedMessageFormat class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var unifiedmessageformat = {
    // the message format's version
    version  : {
        optional: false,
        value: 1.0,
        sanitize: {
            type: "number",
            regEx: null
        }
    },
    // the organisation embedded the client
    organisation   : {
        optional: false,
        value: {},
        sanitize: {
            children: {
                org_id :{
                    optional: false,
                    value: {},
                    sanitize: {
                        type: "string",
                        regEx: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
                    }
                }
            },
            type: "object",
            regEx: null
        }
    },
    // e.g. hostname, service, component, info, ...
    origin   : {
        optional: true,
        value: '',
        sanitize: {
            type: "string",
            regEx: null
        }
    },
    // execution context (e.g. client_addr, execution_type (web, console, cronjob, ...), start_time)
    context  : {
        optional: true,
        value: '',
        sanitize: {
            type: "string",
            regEx: null
        }
    },
    // as the name suggests :)
    timestamp: {
        optional: false,
        value: '',
        sanitize: {
            type: "number",
            regEx: '^[0-9]{13,}$'
        }
    },
    // an id, unique in the current request context
    request_id    : {
        optional: false,
        value: '',
        sanitize: {
            type: "string",
            regEx: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
        }
    },
    // an identifier for the messagetype
    handle   : {
        optional: false,
        value: '',
        sanitize: {
            type: "string",
            regEx: null
        }
    },
    // the payload
    body     : {
        optional: false,
        value: [],
        sanitize: {
            children: {
                key :{
                    optional: false,
                    value: '',
                    sanitize: {
                        type: "string",
                        regEx: null
                    }
                }
            },
            type: "object",
            regEx: null
        }
    }
};

module.exports = Object.freeze(unifiedmessageformat);