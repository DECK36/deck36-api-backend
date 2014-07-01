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
// {"type":"cbt","user":{"user_socket_id":1,"user_id":1},"timestamp":"123456789101","version":0.9,"cbt":{"solved":"true","coordinate":[150,8],"entity_coordinate":[120,7]}}

var CbtMessageCreator = function(cbtSolution, userId, isSolved, pixelResult) {

    this.createMessage = function() {
        return {
            type: "cbt",
            user: {
                user_id: userId
            },
            timestamp: cbtSolution.timestamp,
            version: cbtSolution.version,
            cbt: {
                solved: isSolved,
                coordinate: pixelResult.pixel,
                entity_coordinate: pixelResult.entity_pixel
            }
        }
    };
}

module.exports = CbtMessageCreator;







