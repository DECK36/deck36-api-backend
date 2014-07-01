var Spout = require('../../../lib/storm').spout;

//The Spout constructor takes a definition function,
//an input stream and an output stream
var itemEmitter = new Spout(function(events) {
    var collector = null;
    var seqId = 1;

    var items = ["apple","angel","arch","axe","baby","balloon","bear",
    "bird's nest","boat","book","boy","bridge","broom","bumble bee","bat",
    "cathedral","cheese","child","daffodils","dragon","elephant","eye","fish",
    "fleur-de-lys","frog","gate","grasshopper","guitar","hawk","heart",
    "horns","horse-shoe","ivy","ladder","lighthouse","lightning",
    "magnifying glass","medicine bottle","mermaid","monkey","mouse",
    "mushroom","oyster","owl","otter","palm tree","peacock","plate",
    "rocket","rag doll","a ring"];

    //You can listen to the spout "open", "ack" and "fail" events to
    events.on('open', function(c) {
        collector = c;
    });

    events.on('ack', function(messageId) {
        //console.log(messageId + ' acked');
    });

    events.on('fail', function(messageId) {
        //console.log(messageId + ' failed');
    });

    //The definition function must return a function used as
    //the nextTuple function.
    return function(cb) {

        collector.emit([ "nodejs", items[Math.floor(Math.random()*items.length)] ], seqId++);
        cb();

    }

}, process.stdin, process.stdout);


process.stdin.setEncoding('utf8');
process.stdin.resume();


