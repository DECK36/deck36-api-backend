/**
 * Declares the indexController.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
module.exports = function ()
{
    var self = {
        connectAction: function (req, res) {
            res.send('<html><head><title>Connect</title></head><body>Connect</body></html>');
        }
    };

    return self;
};