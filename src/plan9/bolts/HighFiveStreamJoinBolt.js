var Bolt = require('../../../lib/storm').bolt;
var nodeRedis = require('redis');
var Future = require('fibers/future');


function extract_user_from_key(keystring) {
    var tokens = keystring.split("_");
    return tokens[5];
}


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

    //The definition function must return a function used as
    //the execute function.
    return function(tuple, cb) {

        this._protocol.sendLog("\n\n\nTUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");

        var object = tuple["values"][0];
        var type = object["type"];

        if (type != "cbt") {
            collector.ack(tuple);
            cb();
            return;
        }

        var result = object["cbt"]["solved"];

        if (result != "true") {
            collector.ack(tuple);
            cb();
            return;
        }

        // get storm config 
        var stormConf = this._protocol.getStormConf();
        var highFiveTimeWindow = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge_timewindow'];

        var userObj = object['user'];
        var user = userObj['user_id'];

        var katze = object['cbt']['entity_coordinate'].join(":");

        this._protocol.sendLog("\n\n\n[node.js] HIGHFIVE DATA : " + type + " " + result + " " + katze + " " + user + " badge_timewindow: " + highFiveTimeWindow);

        var key_user = 'plan9_badge_highfive_sjoin_' + katze + '_' + user;
        var key_star = 'plan9_badge_highfive_sjoin_' + katze + '_*';

        // We use incr to skip argument parsing
        // We expire the key after 5 seconds, should ideally be a config option
        redis.incr(key_user);
        redis.expire(key_user, highFiveTimeWindow);

        var katzenFuture = new Future;

        redis.keys(key_star, function(err, reply) {

            if (err) {
                collector.fail(tuple);
                cb();
                katzenFuture.
                return ({});
            }

            katzenFuture.
            return (reply);
        });

        var katzen = katzenFuture.wait();

        // If we find multiple keys, multiple users solved a recent CBT using 
        // the same cat. We'll reward that behaviour with a 'HighFive' badge.
        if (katzen.length > 1) {

            // extract all the users from the keys
            userGroup = [];

            katzen.forEach(function(value) {
                userGroup.push(extract_user_from_key(value));
                redis.del(value);
            }); // foreach    

            highFiveBadge = {};
            highFiveBadge['katze'] = katze;

            highFiveBadge['badge'] = {};
            highFiveBadge['badge']['name'] = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge']['name'];
            highFiveBadge['badge']['text'] = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge']['text'];
            highFiveBadge['badge']['size'] = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge']['size'];
            highFiveBadge['badge']['color'] = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge']['color'];
            highFiveBadge['badge']['effect'] = stormConf['deck36_storm']['HighFiveStreamJoinBolt']['badge']['effect'];

            highFiveBadge['points'] = {};
            highFiveBadge['points']['increment'] = 20; // TODO - further badge data might be added to config

            highFiveBadge['action'] = {};
            highFiveBadge['action']['type'] = 'none';
            highFiveBadge['action']['amount'] = 0;

            highFiveBadge['type'] = 'badge';
            highFiveBadge['version'] = 1;
            highFiveBadge['timestamp'] = new Date().getTime();

            userGroup.forEach(function(user) {

                // specify the user 
                highFiveBadge['user'] = {};
                highFiveBadge['user']['user_id'] = parseInt(user);

                // emit the badge
                collector.emit([highFiveBadge], null, [tuple]);

            }); // foreach

        } // if katzen.length


        // collector.emit(tuple.values.join(', '));
        collector.ack(tuple);
        cb();
    }.future()

}, process.stdin, process.stdout);

process.stdin.setEncoding('utf8');
process.stdin.resume();