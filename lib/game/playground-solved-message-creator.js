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

var PlaygroundSolvedMessageCreator = function(isSolved, pixelResult) {

    this.createMessage = function() {
        return {
            payload: {
                cbt: {
                    solved: isSolved, playground: pixelResult.playground
                }
            }, commandtype: 'setPlaygroundSolvedCbt'
        };
    }
}

module.exports = PlaygroundSolvedMessageCreator;







