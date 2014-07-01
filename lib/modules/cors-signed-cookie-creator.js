/**
 * Declares the cors-signed-cookie-creator.js class.
 *
 * CORS = Cross-origin resource sharing (see http://www.w3.org/TR/cors/, http://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2014 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var config = require('config')
    , logger = require('./logger')
    , uuid = require('node-uuid');

function CorsSignedCookieHandler(uuidBuilder, globalConfig)
{
    var config = globalConfig;

    /**
     *
     * The node-uuid creator.
     *
     * @type {uuid} uuid
     */
    var uuid = uuidBuilder;

    /**
     * Handles the cookie creation in a app.use (express) call as
     * express middleware.
     *
     * @returns corsSignedCookieHandling {Function}
     */
    this.handleCookieRequest = function() {
        return function (req, res, next)
        {
            // @see: config/server/default.yml
            var url = config.client.connect_url;
            var name = config.cookie.name;

            // logger.debug("url == req.url: " + (url == req.url));
            // logger.debug("!req.signedCookies[name]: " + (!req.signedCookies[name]));

            // set cookie only if no cookie isset and url fits
            /*if (url == req.url
                && !req.signedCookies[name]) {

                res.cookie(
                    name,
                    uuid.v4(),
                    {
                        domain : config.cookie.domain,
                        path   : config.cookie.path,
                        secure : true,
                        signed : true,
                        expires: new Date(Date.now() + config.cookie.lifetime)
                    }
                );
            }*/

            // Because of the CORS definition, Cookies can be sent only if the Access-Control-Allow-Origin
            // header is NOT a *.
            res.setHeader("Access-Control-Allow-Origin", req.headers['origin']);
            res.setHeader("Access-Control-Allow-Credentials", "true");

            next();
        };
    };
}

module.exports = new CorsSignedCookieHandler(uuid, config);