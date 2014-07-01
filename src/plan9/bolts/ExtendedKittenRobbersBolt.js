/**
 * Storm bolt for the "Plan9 From Outer Space" tutorial game.
 *
 * Implements the (crazy|deluded|extended) Kitten Robbers.
 *
 * The KittenRobbers bolt aggregates all points for each user
 * that are generated within a recent time frame (a "round").
 *
 * At the end of each round, the user with the highest amount of
 * generated points "wins" and is "attacked" by the Kitten Robbers.
 * The Kitten Robbers steal some of the players kittens, and the
 * player looses a certain amount (currently around 20%) of the points
 * the player generated in the last round. Har har.
 *
 * This bolt is part of a tutorial, therefore all functionality
 * is commented. This is intentional.
 *
 *
 * @author Stefan Schadwinkel <stefan.schadwinkel@deck36.de>
 * @copyright Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */

var Bolt = require('../../../lib/storm').bolt;
var nodeRedis = require('redis');
var Future = require('fibers/future');

//The Bolt constructor takes a definition function,
//an input stream and an output stream
var joinBolt = new Bolt(function(events) {
    var collector = null;
    var redis = null;

    //You can listen to the bolt "prepare" event to
    //fetch a reference to the OutputCollector instance
    events.on('prepare', function(c) {
        collector = c;
        redis = nodeRedis.createClient();
    });

    /* CODE6
     * Step six: Implement processTick logic.
     * See below.
     *
     *
     */

    /* CODE5 
     * Step five: Implement processTuple logic.
     * See below.
     *
     *
     */


    /* CODE4
     * Step four: Provide the function to discriminate tick tuples.
     *

    // identify tick tuples 
    var isTickTuple = function(tuple) {
        return ((tuple.component === "__system") && (tuple.stream === "__tick"));
    };

    */



    /* CODE3
     * Step three: create a processTick function.
     * Must forward the "_protocol" from the Bolt instance.
     *

    // business logic

    var processTick = function(protocol, tuple) {

        protocol.sendLog("\n\n\nTICK TUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");

        // the user who made the most points in the last round
        // will be the target of attack

        var userFuture = new Future;

        redis.zrevrange("plan9:ExtendedKittenRobbersZSet", 0, 0, function(err, reply) {

            if (err) {
                collector.fail(tuple);
                cb();
                userFuture.
                return ({});
            }

            userFuture.
            return (reply);
        });

        var winner = userFuture.wait();

        if (winner.length > 0) {
            // get aggregated points of the 'winning' user
            var scoreFuture = new Future;

            redis.zscore("plan9:ExtendedKittenRobbersZSet", winner, function(err, reply) {

                if (err) {
                    collector.fail(tuple);
                    cb();
                    scoreFuture.
                    return ({});
                }

                scoreFuture.
                return (reply);
            });

            var winnerScore = scoreFuture.wait();
            var penaltyScore = Math.round(-1 * winnerScore * 0.20);

            protocol.sendLog("\n\n\nEXTENDED KITTER ROBBER WILL ATTACK USER " + JSON.stringify(winner) + "  -- SCORE: " + winnerScore + "  -- PENALTY: " + penaltyScore + "\n\n");

            // clear scores for next round
            redis.del("plan9:ExtendedKittenRobbersZSet");

            // build attack badge
            var kittenRobbersFromOuterSpace = {};

            // get storm config 
            var stormConf = protocol.getStormConf();

            kittenRobbersFromOuterSpace['badge'] = {};
            kittenRobbersFromOuterSpace['badge']['name'] = stormConf['deck36_storm']['ExtendedKittenRobbersBolt']['badge']['name'];
            kittenRobbersFromOuterSpace['badge']['text'] = stormConf['deck36_storm']['ExtendedKittenRobbersBolt']['badge']['text'];
            kittenRobbersFromOuterSpace['badge']['size'] = stormConf['deck36_storm']['ExtendedKittenRobbersBolt']['badge']['size'];
            kittenRobbersFromOuterSpace['badge']['color'] = stormConf['deck36_storm']['ExtendedKittenRobbersBolt']['badge']['color'];
            kittenRobbersFromOuterSpace['badge']['effect'] = stormConf['deck36_storm']['ExtendedKittenRobbersBolt']['badge']['effect'];

            kittenRobbersFromOuterSpace['points'] = {};
            kittenRobbersFromOuterSpace['points']['increment'] = penaltyScore;

            kittenRobbersFromOuterSpace['action'] = {};
            kittenRobbersFromOuterSpace['action']['type'] = 'none';
            kittenRobbersFromOuterSpace['action']['amount'] = 0;

            kittenRobbersFromOuterSpace['type'] = 'badge';
            kittenRobbersFromOuterSpace['version'] = 1;
            kittenRobbersFromOuterSpace['timestamp'] = new Date().getTime();

            protocol.sendLog("STORMCONF: " + JSON.stringify(kittenRobbersFromOuterSpace));

            // specify the user 
            kittenRobbersFromOuterSpace['user'] = {};
            kittenRobbersFromOuterSpace['user']['user_id'] = parseInt(winner[0]);

            // emit the badge
            protocol.sendLog("\n\n\nEXTENDED KITTER ROBBER BADGE " + JSON.stringify(kittenRobbersFromOuterSpace) + "\n\n");

            collector.emit([kittenRobbersFromOuterSpace]);
        }

    };
*/


    /* CODE2
     * Step two: create a processTuple function
     * Must forward the "_protocol" from the Bolt instance.
     *

    var processTuple = function(protocol, tuple) {

        protocol.sendLog("\n\n\nTUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");

        var object = tuple["values"][0];
        var type = object["type"];

        if (type != "points") {
            collector.ack(tuple);
            cb();
            return;
        }

        var user = object['user_target']['user_id'];

        // deliberately ignore concurrent updates on points 
        // producing the StatusLevelBadge for a specific level
        // multiple times is idempotent in regard to whether
        // the level has been reached.

        // get points increment
        var pointsIncrement = object["points"]["increment"];

        // update point counter in redis zset
        redis.zincrby("plan9:ExtendedKittenRobbersZSet", parseInt(pointsIncrement), user);
        
    };
    */


    /* CODE1
     * Step one: separate tick tuples from usual tuples.
     * Don't forget the .future() wrapper to get a Fiber.
     * 

    //The definition function must return a function used as
    //the execute function.
    return function(tuple, cb) {

        if (isTickTuple(tuple)) {
            processTick(this._protocol, tuple);
        } else {
            processTuple(this._protocol, tuple);
        }

        collector.ack(tuple);
        cb();
    }.future()
*/

}, process.stdin, process.stdout);


process.stdin.setEncoding('utf8');
process.stdin.resume();