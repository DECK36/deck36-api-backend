/**
 * Declares the exceptions.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var util = require('util');

function Exception(msg)  {
    var message = msg;
    this.getMessage = function() {
        return message;
    }
}

module.exports.Exception = Exception;
module.exports.ParameterException = Exception;
module.exports.MessageFormatException = Exception;