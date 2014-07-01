var Bolt = require('../../../lib/storm').bolt;

//The Bolt constructor takes a definition function,
//an input stream and an output stream
var joinBolt = new Bolt(function(events) {
    var collector = null;

    //You can listen to the bolt "prepare" event to
    //fetch a reference to the OutputCollector instance
    events.on('prepare', function(c) {
        collector = c;
    });

    //The definition function must return a function used as
    //the execute function.
    return function(tuple, cb) {

        this._protocol.sendLog("\n\n\nTUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");

        // collector.emit(tuple.values.join(', '));
        collector.ack(tuple);
        cb();
    }

}, process.stdin, process.stdout);

process.stdin.setEncoding('utf8');
process.stdin.resume();

