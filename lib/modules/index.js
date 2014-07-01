/**
 * Declares the index.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
exports = module.exports = {
    corsSignedCookieCreator : require('./cors-signed-cookie-creator'),
    logger : require('./logger'),
    messageFormatter: require('./messageformatter'),
    exceptions: require('./exceptions')
};