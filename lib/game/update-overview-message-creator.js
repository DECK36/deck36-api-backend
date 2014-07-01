/**
 * Declares the cbtcalculator class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2014 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */

var UpdateOverviewMessageCreator = function(pixelResult, twig) {
    // {"solved":{"tablerow":"3", "tablecol":"100"}};
    this.createMessage = function() {
        return {
            payload: { "solved": {"tablerow": pixelResult.pixel[0], "tablecol": pixelResult.pixel[1]} },
            commandtype: 'updateOverview'
        };
    }
}

module.exports = UpdateOverviewMessageCreator;







