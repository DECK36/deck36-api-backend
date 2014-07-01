/**
 * Declares the app.js class.
 *
 * @author     Mike Lohmann <mike.lohmann@deck36.de>
 * @copyright  Copyright (c) 2013 DECK36 GmbH & Co. KG (http://www.deck36.de)
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */
var config = require('config')
    , express = require('express')
    , morgan         = require('morgan')
    , bodyParser     = require('body-parser')
    , methodOverride = require('method-override')
    , compress = require('compression')
    , cookieParser = require('cookie-parser')
    , expressSession = require('express-session')
    , twig = require('twig')
    , redis = require('redis')
    , RedisStore = require('connect-redis')(expressSession)
    , redisClient = redis.createClient(config.redis.port, config.redis.host, config.redis.options)
    , path = require('path')
    , plan9backendmodules = require('../modules')
    , app = express();


app.enable('trust proxy');
app.use(morgan(process.env.NODE_ENV));
app.use(compress()); //compresses (gzip) output
app.use(cookieParser(config.cookie.signature)); // http://expressjs.com/api.html#cookieParser

// ok for non authenticated users to have a session
app.use(expressSession({
    store: new RedisStore({
        port: config.redis.port,
        host: config.redis.host
    }),
    secret: config.cookie.signature,
    proxy: true,  // necessary if you're behind a proxy
    cookie: { secure: config.cookie.secure },
    key: config.session.cookie.name
}));
app.use(plan9backendmodules.corsSignedCookieCreator.handleCookieRequest());

// bootstrap
app.use(express.static(__dirname + '/../../public', {maxAge: 86400000}));

app.use(bodyParser.json()); // beeing able to parse json-encoded request bodies
app.use(bodyParser.urlencoded({extended:true}));

// Enable twig templating engine
app.set('views', __dirname + '/views');
app.set('view engine', twig);
app.set('twig options', {
    cache: process.env.NODE_ENV != 'dev' && process.env.NODE_ENV != 'test',
    strict_variables: false
});

module.exports = app;
module.exports.redisClient = redisClient;
module.exports.checkLogin = function (req, res, next) {
    if(req.session.user) {
        next();
    } else {
        res.redirect('http://' + config.webapp.domain + '/login');
    }
};