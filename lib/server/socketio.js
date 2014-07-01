/**
 * Declares the socketio.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var cookie = require('express/node_modules/cookie')
    , config = require('config')
// , connect = require('express/node_modules/connect')
    , logger = require('../modules').logger;

/**
 * Handles the authorization to send data in socketIo.on('authentication');
 *
 * @param socket
 * @param next
 */
var socketIoAuthorization = function (socket, next) {
    logger.debug('socketIoAuthorization: ', socket.request._query);
    var handshakeData = socket.request;
    if (handshakeData._query
        && handshakeData._query.userId) {
        /*try {
         handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

         handshakeData.uuid = connect.utils.parseSignedCookie(
         handshakeData.cookie[config.cookie.name],
         config.cookie.signature
         );

         logger.error('handshakeData.uuid: ', handshakeData.cookie);
         logger.error('handshakeData.uuid: ', handshakeData.uuid);
         } catch (e) {
         logger.error(e);
         // send HTTP 500
         authCallback('No cookie set or requested from a unauthorized domain!');
         }*/

        // Because cookie is signed, the cookie's value for iojs should not be the same as uuid. For plan9 it should, because,
        // the sf2 cookie is NOT signed (Not useing NelmioSecurityBundle)
        //if (handshakeData.uuid !== false && handshakeData.cookie[config.cookie.name] == handshakeData.uuid) {

        socket.uuid = handshakeData._query.userId;
        logger.debug('Uuid: ' + socket.uuid);
        next();
        /*} else {
         // send HTTP 403
         authCallback(null, false);
         }*/

    } else {
        // send HTTP 500
        next(new Error('No cookie set or requested from a unauthorized domain!'));
    }
};

module.exports.socketIoAuthorization = socketIoAuthorization;