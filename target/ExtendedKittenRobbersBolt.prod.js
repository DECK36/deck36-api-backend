(function() {
    var modules = {}, definitions = {};
    var _require = function(path) {
        if (modules[path]) return modules[path];
        var module = {
            exports: {}
        }, definition = definitions[path];
        if (!definition) {
            try {
                return require(path);
            } catch (e) {}
            throw new Error("unable to load " + path);
        }
        return modules[path] = module.exports = definition(_require, module, module.exports, path);
    };
    var define = function(path, definition) {
        definitions[path] = definition;
    };
    if (typeof global == "undefined") {
        global = window;
    }
    if (typeof window == "undefined") {
        global.window = global;
    }
    if (typeof window.process == "undefined") {
        window.process = {};
    }
    if (typeof document == "undefined") {
        global.document = global;
    }
    if (typeof document.documentElement == "undefined") {
        document.documentElement = {};
    }
    if (typeof document.documentElement.style == "undefined") {
        document.documentElement.style = {};
    }
    if (typeof navigator == "undefined") {
        global.navigator = global;
    }
    if (typeof navigator.userAgent == "undefined") {
        navigator.userAgent = "sardines";
    }
    if (typeof navigator.platform == "undefined") {
        navigator.platform = "sardines";
    }
    define("plan9-backend/src/plan9/bolts/ExtendedKittenRobbersBolt.js", function(require, module, exports, __dirname, __filename) {
        var Bolt = require("plan9-backend/lib/storm/index.js").bolt;
        var nodeRedis = require("redis/index.js");
        var Future = require("fibers/future.js");
        var joinBolt = new Bolt(function(events) {
            var collector = null;
            var redis = null;
            events.on("prepare", function(c) {
                collector = c;
                redis = nodeRedis.createClient();
            });
            var isTickTuple = function(tuple) {
                return tuple.component === "__system" && tuple.stream === "__tick";
            };
            var processTick = function(protocol, tuple) {
                protocol.sendLog("\n\n\nTICK TUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");
                var userFuture = new Future;
                redis.zrevrange("plan9:ExtendedKittenRobbersZSet", 0, 0, function(err, reply) {
                    if (err) {
                        collector.fail(tuple);
                        cb();
                        userFuture.return({});
                    }
                    userFuture.return(reply);
                });
                var winner = userFuture.wait();
                if (winner.length > 0) {
                    var scoreFuture = new Future;
                    redis.zscore("plan9:ExtendedKittenRobbersZSet", winner, function(err, reply) {
                        if (err) {
                            collector.fail(tuple);
                            cb();
                            scoreFuture.return({});
                        }
                        scoreFuture.return(reply);
                    });
                    var winnerScore = scoreFuture.wait();
                    var penaltyScore = Math.round(-1 * winnerScore * .2);
                    protocol.sendLog("\n\n\nEXTENDED KITTER ROBBER WILL ATTACK USER " + JSON.stringify(winner) + "  -- SCORE: " + winnerScore + "  -- PENALTY: " + penaltyScore + "\n\n");
                    redis.del("plan9:ExtendedKittenRobbersZSet");
                    var kittenRobbersFromOuterSpace = {};
                    var stormConf = protocol.getStormConf();
                    kittenRobbersFromOuterSpace["badge"] = {};
                    kittenRobbersFromOuterSpace["badge"]["name"] = stormConf["deck36_storm"]["ExtendedKittenRobbersBolt"]["badge"]["name"];
                    kittenRobbersFromOuterSpace["badge"]["text"] = stormConf["deck36_storm"]["ExtendedKittenRobbersBolt"]["badge"]["text"];
                    kittenRobbersFromOuterSpace["badge"]["size"] = stormConf["deck36_storm"]["ExtendedKittenRobbersBolt"]["badge"]["size"];
                    kittenRobbersFromOuterSpace["badge"]["color"] = stormConf["deck36_storm"]["ExtendedKittenRobbersBolt"]["badge"]["color"];
                    kittenRobbersFromOuterSpace["badge"]["effect"] = stormConf["deck36_storm"]["ExtendedKittenRobbersBolt"]["badge"]["effect"];
                    kittenRobbersFromOuterSpace["points"] = {};
                    kittenRobbersFromOuterSpace["points"]["increment"] = penaltyScore;
                    kittenRobbersFromOuterSpace["action"] = {};
                    kittenRobbersFromOuterSpace["action"]["type"] = "none";
                    kittenRobbersFromOuterSpace["action"]["amount"] = 0;
                    kittenRobbersFromOuterSpace["type"] = "badge";
                    kittenRobbersFromOuterSpace["version"] = 1;
                    kittenRobbersFromOuterSpace["timestamp"] = (new Date).getTime();
                    protocol.sendLog("STORMCONF: " + JSON.stringify(kittenRobbersFromOuterSpace));
                    kittenRobbersFromOuterSpace["user"] = {};
                    kittenRobbersFromOuterSpace["user"]["user_id"] = parseInt(winner[0]);
                    protocol.sendLog("\n\n\nEXTENDED KITTER ROBBER BADGE " + JSON.stringify(kittenRobbersFromOuterSpace) + "\n\n");
                    collector.emit([ kittenRobbersFromOuterSpace ]);
                }
            };
            var processTuple = function(protocol, tuple) {
                protocol.sendLog("\n\n\nTUPLE FROM NODE.JS: " + JSON.stringify(tuple) + "\n\n");
                var object = tuple["values"][0];
                var type = object["type"];
                if (type != "points") {
                    collector.ack(tuple);
                    cb();
                    return;
                }
                var user = object["user_target"]["user_id"];
                var pointsIncrement = object["points"]["increment"];
                redis.zincrby("plan9:ExtendedKittenRobbersZSet", parseInt(pointsIncrement), user);
            };
            return function(tuple, cb) {
                if (isTickTuple(tuple)) {
                    processTick(this._protocol, tuple);
                } else {
                    processTuple(this._protocol, tuple);
                }
                collector.ack(tuple);
                cb();
            }.future();
        }, process.stdin, process.stdout);
        process.stdin.setEncoding("utf8");
        process.stdin.resume();
        return module.exports;
    });
    define("plan9-backend/lib/storm/index.js", function(require, module, exports, __dirname, __filename) {
        exports = module.exports = {
            bolt: require("plan9-backend/lib/storm/bolt.js").Bolt,
            spout: require("plan9-backend/lib/storm/spout.js").Spout,
            tuple: require("plan9-backend/lib/storm/tuple.js").Tuple
        };
        return module.exports;
    });
    define("redis/index.js", function(require, module, exports, __dirname, __filename) {
        var net = require("net"), util = require("redis/lib/util.js"), Queue = require("redis/lib/queue.js"), to_array = require("redis/lib/to_array.js"), events = require("events"), crypto = require("crypto"), parsers = [], commands, connection_id = 0, default_port = 6379, default_host = "127.0.0.1";
        exports.debug_mode = false;
        var arraySlice = Array.prototype.slice;
        function trace() {
            if (!exports.debug_mode) return;
            console.log.apply(null, arraySlice.call(arguments));
        }
        try {
            require("redis/lib/parser/hiredis.js");
            parsers.push(require("redis/lib/parser/hiredis.js"));
        } catch (err) {
            if (exports.debug_mode) {
                console.warn("hiredis parser not installed.");
            }
        }
        parsers.push(require("redis/lib/parser/javascript.js"));
        function RedisClient(stream, options) {
            this.stream = stream;
            this.options = options = options || {};
            this.connection_id = ++connection_id;
            this.connected = false;
            this.ready = false;
            this.connections = 0;
            if (this.options.socket_nodelay === undefined) {
                this.options.socket_nodelay = true;
            }
            this.should_buffer = false;
            this.command_queue_high_water = this.options.command_queue_high_water || 1e3;
            this.command_queue_low_water = this.options.command_queue_low_water || 0;
            this.max_attempts = null;
            if (options.max_attempts && !isNaN(options.max_attempts) && options.max_attempts > 0) {
                this.max_attempts = +options.max_attempts;
            }
            this.command_queue = new Queue;
            this.offline_queue = new Queue;
            this.commands_sent = 0;
            this.connect_timeout = false;
            if (options.connect_timeout && !isNaN(options.connect_timeout) && options.connect_timeout > 0) {
                this.connect_timeout = +options.connect_timeout;
            }
            this.enable_offline_queue = true;
            if (typeof this.options.enable_offline_queue === "boolean") {
                this.enable_offline_queue = this.options.enable_offline_queue;
            }
            this.retry_max_delay = null;
            if (options.retry_max_delay !== undefined && !isNaN(options.retry_max_delay) && options.retry_max_delay > 0) {
                this.retry_max_delay = options.retry_max_delay;
            }
            this.initialize_retry_vars();
            this.pub_sub_mode = false;
            this.subscription_set = {};
            this.monitoring = false;
            this.closing = false;
            this.server_info = {};
            this.auth_pass = null;
            if (options.auth_pass !== undefined) {
                this.auth_pass = options.auth_pass;
            }
            this.parser_module = null;
            this.selected_db = null;
            this.old_state = null;
            var self = this;
            this.stream.on("connect", function() {
                self.on_connect();
            });
            this.stream.on("data", function(buffer_from_socket) {
                self.on_data(buffer_from_socket);
            });
            this.stream.on("error", function(msg) {
                self.on_error(msg.message);
            });
            this.stream.on("close", function() {
                self.connection_gone("close");
            });
            this.stream.on("end", function() {
                self.connection_gone("end");
            });
            this.stream.on("drain", function() {
                self.should_buffer = false;
                self.emit("drain");
            });
            events.EventEmitter.call(this);
        }
        util.inherits(RedisClient, events.EventEmitter);
        exports.RedisClient = RedisClient;
        RedisClient.prototype.initialize_retry_vars = function() {
            this.retry_timer = null;
            this.retry_totaltime = 0;
            this.retry_delay = 150;
            this.retry_backoff = 1.7;
            this.attempts = 1;
        };
        RedisClient.prototype.unref = function() {
            trace("User requesting to unref the connection");
            if (this.connected) {
                trace("unref'ing the socket connection");
                this.stream.unref();
            } else {
                trace("Not connected yet, will unref later");
                this.once("connect", function() {
                    this.unref();
                });
            }
        };
        RedisClient.prototype.flush_and_error = function(message) {
            var command_obj, error;
            error = new Error(message);
            while (this.offline_queue.length > 0) {
                command_obj = this.offline_queue.shift();
                if (typeof command_obj.callback === "function") {
                    try {
                        command_obj.callback(error);
                    } catch (callback_err) {
                        this.emit("error", callback_err);
                    }
                }
            }
            this.offline_queue = new Queue;
            while (this.command_queue.length > 0) {
                command_obj = this.command_queue.shift();
                if (typeof command_obj.callback === "function") {
                    try {
                        command_obj.callback(error);
                    } catch (callback_err) {
                        this.emit("error", callback_err);
                    }
                }
            }
            this.command_queue = new Queue;
        };
        RedisClient.prototype.on_error = function(msg) {
            var message = "Redis connection to " + this.host + ":" + this.port + " failed - " + msg;
            if (this.closing) {
                return;
            }
            if (exports.debug_mode) {
                console.warn(message);
            }
            this.flush_and_error(message);
            this.connected = false;
            this.ready = false;
            this.emit("error", new Error(message));
            this.connection_gone("error");
        };
        RedisClient.prototype.do_auth = function() {
            var self = this;
            if (exports.debug_mode) {
                console.log("Sending auth to " + self.host + ":" + self.port + " id " + self.connection_id);
            }
            self.send_anyway = true;
            self.send_command("auth", [ this.auth_pass ], function(err, res) {
                if (err) {
                    if (err.toString().match("LOADING")) {
                        console.log("Redis still loading, trying to authenticate later");
                        setTimeout(function() {
                            self.do_auth();
                        }, 2e3);
                        return;
                    } else if (err.toString().match("no password is set")) {
                        console.log("Warning: Redis server does not require a password, but a password was supplied.");
                        err = null;
                        res = "OK";
                    } else {
                        return self.emit("error", new Error("Auth error: " + err.message));
                    }
                }
                if (res.toString() !== "OK") {
                    return self.emit("error", new Error("Auth failed: " + res.toString()));
                }
                if (exports.debug_mode) {
                    console.log("Auth succeeded " + self.host + ":" + self.port + " id " + self.connection_id);
                }
                if (self.auth_callback) {
                    self.auth_callback(err, res);
                    self.auth_callback = null;
                }
                self.emit("connect");
                self.initialize_retry_vars();
                if (self.options.no_ready_check) {
                    self.on_ready();
                } else {
                    self.ready_check();
                }
            });
            self.send_anyway = false;
        };
        RedisClient.prototype.on_connect = function() {
            if (exports.debug_mode) {
                console.log("Stream connected " + this.host + ":" + this.port + " id " + this.connection_id);
            }
            this.connected = true;
            this.ready = false;
            this.connections += 1;
            this.command_queue = new Queue;
            this.emitted_end = false;
            if (this.options.socket_nodelay) {
                this.stream.setNoDelay();
            }
            this.stream.setTimeout(0);
            this.init_parser();
            if (this.auth_pass) {
                this.do_auth();
            } else {
                this.emit("connect");
                this.initialize_retry_vars();
                if (this.options.no_ready_check) {
                    this.on_ready();
                } else {
                    this.ready_check();
                }
            }
        };
        RedisClient.prototype.init_parser = function() {
            var self = this;
            if (this.options.parser) {
                if (!parsers.some(function(parser) {
                    if (parser.name === self.options.parser) {
                        self.parser_module = parser;
                        if (exports.debug_mode) {
                            console.log("Using parser module: " + self.parser_module.name);
                        }
                        return true;
                    }
                })) {
                    throw new Error("Couldn't find named parser " + self.options.parser + " on this system");
                }
            } else {
                if (exports.debug_mode) {
                    console.log("Using default parser module: " + parsers[0].name);
                }
                this.parser_module = parsers[0];
            }
            this.parser_module.debug_mode = exports.debug_mode;
            this.reply_parser = new this.parser_module.Parser({
                return_buffers: self.options.return_buffers || self.options.detect_buffers || false
            });
            this.reply_parser.on("reply error", function(reply) {
                if (reply instanceof Error) {
                    self.return_error(reply);
                } else {
                    self.return_error(new Error(reply));
                }
            });
            this.reply_parser.on("reply", function(reply) {
                self.return_reply(reply);
            });
            this.reply_parser.on("error", function(err) {
                self.emit("error", new Error("Redis reply parser error: " + err.stack));
            });
        };
        RedisClient.prototype.on_ready = function() {
            var self = this;
            this.ready = true;
            if (this.old_state !== null) {
                this.monitoring = this.old_state.monitoring;
                this.pub_sub_mode = this.old_state.pub_sub_mode;
                this.selected_db = this.old_state.selected_db;
                this.old_state = null;
            }
            if (this.selected_db !== null) {
                var pub_sub_mode = this.pub_sub_mode;
                this.pub_sub_mode = false;
                this.send_command("select", [ this.selected_db ]);
                this.pub_sub_mode = pub_sub_mode;
            }
            if (this.pub_sub_mode === true) {
                var callback_count = 0;
                var callback = function() {
                    callback_count--;
                    if (callback_count === 0) {
                        self.emit("ready");
                    }
                };
                Object.keys(this.subscription_set).forEach(function(key) {
                    var parts = key.split(" ");
                    if (exports.debug_mode) {
                        console.warn("sending pub/sub on_ready " + parts[0] + ", " + parts[1]);
                    }
                    callback_count++;
                    self.send_command(parts[0] + "scribe", [ parts[1] ], callback);
                });
                return;
            } else if (this.monitoring) {
                this.send_command("monitor");
            } else {
                this.send_offline_queue();
            }
            this.emit("ready");
        };
        RedisClient.prototype.on_info_cmd = function(err, res) {
            var self = this, obj = {}, lines, retry_time;
            if (err) {
                return self.emit("error", new Error("Ready check failed: " + err.message));
            }
            lines = res.toString().split("\r\n");
            lines.forEach(function(line) {
                var parts = line.split(":");
                if (parts[1]) {
                    obj[parts[0]] = parts[1];
                }
            });
            obj.versions = [];
            if (obj.redis_version) {
                obj.redis_version.split(".").forEach(function(num) {
                    obj.versions.push(+num);
                });
            }
            this.server_info = obj;
            if (!obj.loading || obj.loading && obj.loading === "0") {
                if (exports.debug_mode) {
                    console.log("Redis server ready.");
                }
                this.on_ready();
            } else {
                retry_time = obj.loading_eta_seconds * 1e3;
                if (retry_time > 1e3) {
                    retry_time = 1e3;
                }
                if (exports.debug_mode) {
                    console.log("Redis server still loading, trying again in " + retry_time);
                }
                setTimeout(function() {
                    self.ready_check();
                }, retry_time);
            }
        };
        RedisClient.prototype.ready_check = function() {
            var self = this;
            if (exports.debug_mode) {
                console.log("checking server ready state...");
            }
            this.send_anyway = true;
            this.info(function(err, res) {
                self.on_info_cmd(err, res);
            });
            this.send_anyway = false;
        };
        RedisClient.prototype.send_offline_queue = function() {
            var command_obj, buffered_writes = 0;
            while (this.offline_queue.length > 0) {
                command_obj = this.offline_queue.shift();
                if (exports.debug_mode) {
                    console.log("Sending offline command: " + command_obj.command);
                }
                buffered_writes += !this.send_command(command_obj.command, command_obj.args, command_obj.callback);
            }
            this.offline_queue = new Queue;
            if (!buffered_writes) {
                this.should_buffer = false;
                this.emit("drain");
            }
        };
        RedisClient.prototype.connection_gone = function(why) {
            var self = this;
            if (this.retry_timer) {
                return;
            }
            if (exports.debug_mode) {
                console.warn("Redis connection is gone from " + why + " event.");
            }
            this.connected = false;
            this.ready = false;
            if (this.old_state === null) {
                var state = {
                    monitoring: this.monitoring,
                    pub_sub_mode: this.pub_sub_mode,
                    selected_db: this.selected_db
                };
                this.old_state = state;
                this.monitoring = false;
                this.pub_sub_mode = false;
                this.selected_db = null;
            }
            if (!this.emitted_end) {
                this.emit("end");
                this.emitted_end = true;
            }
            this.flush_and_error("Redis connection gone from " + why + " event.");
            if (this.closing) {
                this.retry_timer = null;
                if (exports.debug_mode) {
                    console.warn("connection ended from quit command, not retrying.");
                }
                return;
            }
            var nextDelay = Math.floor(this.retry_delay * this.retry_backoff);
            if (this.retry_max_delay !== null && nextDelay > this.retry_max_delay) {
                this.retry_delay = this.retry_max_delay;
            } else {
                this.retry_delay = nextDelay;
            }
            if (exports.debug_mode) {
                console.log("Retry connection in " + this.retry_delay + " ms");
            }
            if (this.max_attempts && this.attempts >= this.max_attempts) {
                this.retry_timer = null;
                console.error("node_redis: Couldn't get Redis connection after " + this.max_attempts + " attempts.");
                return;
            }
            this.attempts += 1;
            this.emit("reconnecting", {
                delay: self.retry_delay,
                attempt: self.attempts
            });
            this.retry_timer = setTimeout(function() {
                if (exports.debug_mode) {
                    console.log("Retrying connection...");
                }
                self.retry_totaltime += self.retry_delay;
                if (self.connect_timeout && self.retry_totaltime >= self.connect_timeout) {
                    self.retry_timer = null;
                    console.error("node_redis: Couldn't get Redis connection after " + self.retry_totaltime + "ms.");
                    return;
                }
                self.stream.connect(self.port, self.host);
                self.retry_timer = null;
            }, this.retry_delay);
        };
        RedisClient.prototype.on_data = function(data) {
            if (exports.debug_mode) {
                console.log("net read " + this.host + ":" + this.port + " id " + this.connection_id + ": " + data.toString());
            }
            try {
                this.reply_parser.execute(data);
            } catch (err) {
                this.emit("error", err);
            }
        };
        RedisClient.prototype.return_error = function(err) {
            var command_obj = this.command_queue.shift(), queue_len = this.command_queue.getLength();
            if (this.pub_sub_mode === false && queue_len === 0) {
                this.command_queue = new Queue;
                this.emit("idle");
            }
            if (this.should_buffer && queue_len <= this.command_queue_low_water) {
                this.emit("drain");
                this.should_buffer = false;
            }
            if (command_obj && typeof command_obj.callback === "function") {
                try {
                    command_obj.callback(err);
                } catch (callback_err) {
                    this.emit("error", callback_err);
                }
            } else {
                console.log("node_redis: no callback to send error: " + err.message);
                this.emit("error", err);
            }
        };
        function try_callback(client, callback, reply) {
            try {
                callback(null, reply);
            } catch (err) {
                if (process.domain) {
                    process.domain.emit("error", err);
                    process.domain.exit();
                } else {
                    client.emit("error", err);
                }
            }
        }
        function reply_to_object(reply) {
            var obj = {}, j, jl, key, val;
            if (reply.length === 0) {
                return null;
            }
            for (j = 0, jl = reply.length; j < jl; j += 2) {
                key = reply[j].toString("binary");
                val = reply[j + 1];
                obj[key] = val;
            }
            return obj;
        }
        function reply_to_strings(reply) {
            var i;
            if (Buffer.isBuffer(reply)) {
                return reply.toString();
            }
            if (Array.isArray(reply)) {
                for (i = 0; i < reply.length; i++) {
                    if (reply[i] !== null && reply[i] !== undefined) {
                        reply[i] = reply[i].toString();
                    }
                }
                return reply;
            }
            return reply;
        }
        RedisClient.prototype.return_reply = function(reply) {
            var command_obj, len, type, timestamp, argindex, args, queue_len;
            if (Array.isArray(reply) && reply.length > 0 && reply[0]) {
                type = reply[0].toString();
            }
            if (this.pub_sub_mode && (type == "message" || type == "pmessage")) {
                trace("received pubsub message");
            } else {
                command_obj = this.command_queue.shift();
            }
            queue_len = this.command_queue.getLength();
            if (this.pub_sub_mode === false && queue_len === 0) {
                this.command_queue = new Queue;
                this.emit("idle");
            }
            if (this.should_buffer && queue_len <= this.command_queue_low_water) {
                this.emit("drain");
                this.should_buffer = false;
            }
            if (command_obj && !command_obj.sub_command) {
                if (typeof command_obj.callback === "function") {
                    if (this.options.detect_buffers && command_obj.buffer_args === false) {
                        reply = reply_to_strings(reply);
                    }
                    if (reply && "hgetall" === command_obj.command.toLowerCase()) {
                        reply = reply_to_object(reply);
                    }
                    try_callback(this, command_obj.callback, reply);
                } else if (exports.debug_mode) {
                    console.log("no callback for reply: " + (reply && reply.toString && reply.toString()));
                }
            } else if (this.pub_sub_mode || command_obj && command_obj.sub_command) {
                if (Array.isArray(reply)) {
                    type = reply[0].toString();
                    if (type === "message") {
                        this.emit("message", reply[1].toString(), reply[2]);
                    } else if (type === "pmessage") {
                        this.emit("pmessage", reply[1].toString(), reply[2].toString(), reply[3]);
                    } else if (type === "subscribe" || type === "unsubscribe" || type === "psubscribe" || type === "punsubscribe") {
                        if (reply[2] === 0) {
                            this.pub_sub_mode = false;
                            if (this.debug_mode) {
                                console.log("All subscriptions removed, exiting pub/sub mode");
                            }
                        } else {
                            this.pub_sub_mode = true;
                        }
                        var reply1String = reply[1] === null ? null : reply[1].toString();
                        if (command_obj && typeof command_obj.callback === "function") {
                            try_callback(this, command_obj.callback, reply1String);
                        }
                        this.emit(type, reply1String, reply[2]);
                    } else {
                        throw new Error("subscriptions are active but got unknown reply type " + type);
                    }
                } else if (!this.closing) {
                    throw new Error("subscriptions are active but got an invalid reply: " + reply);
                }
            } else if (this.monitoring) {
                len = reply.indexOf(" ");
                timestamp = reply.slice(0, len);
                argindex = reply.indexOf('"');
                args = reply.slice(argindex + 1, -1).split('" "').map(function(elem) {
                    return elem.replace(/\\"/g, '"');
                });
                this.emit("monitor", timestamp, args);
            } else {
                throw new Error("node_redis command queue state error. If you can reproduce this, please report it.");
            }
        };
        function Command(command, args, sub_command, buffer_args, callback) {
            this.command = command;
            this.args = args;
            this.sub_command = sub_command;
            this.buffer_args = buffer_args;
            this.callback = callback;
        }
        RedisClient.prototype.send_command = function(command, args, callback) {
            var arg, command_obj, i, il, elem_count, buffer_args, stream = this.stream, command_str = "", buffered_writes = 0, last_arg_type, lcaseCommand;
            if (typeof command !== "string") {
                throw new Error("First argument to send_command must be the command name string, not " + typeof command);
            }
            if (Array.isArray(args)) {
                if (typeof callback === "function") {} else if (!callback) {
                    last_arg_type = typeof args[args.length - 1];
                    if (last_arg_type === "function" || last_arg_type === "undefined") {
                        callback = args.pop();
                    }
                } else {
                    throw new Error("send_command: last argument must be a callback or undefined");
                }
            } else {
                throw new Error("send_command: second argument must be an array");
            }
            if (callback && process.domain) callback = process.domain.bind(callback);
            lcaseCommand = command.toLowerCase();
            if ((lcaseCommand === "sadd" || lcaseCommand === "srem") && args.length > 0 && Array.isArray(args[args.length - 1])) {
                args = args.slice(0, -1).concat(args[args.length - 1]);
            }
            if (command === "set" || command === "setex") {
                if (args[args.length - 1] === undefined || args[args.length - 1] === null) {
                    var err = new Error("send_command: " + command + " value must not be undefined or null");
                    return callback && callback(err);
                }
            }
            buffer_args = false;
            for (i = 0, il = args.length, arg; i < il; i += 1) {
                if (Buffer.isBuffer(args[i])) {
                    buffer_args = true;
                }
            }
            command_obj = new Command(command, args, false, buffer_args, callback);
            if (!this.ready && !this.send_anyway || !stream.writable) {
                if (exports.debug_mode) {
                    if (!stream.writable) {
                        console.log("send command: stream is not writeable.");
                    }
                }
                if (this.enable_offline_queue) {
                    if (exports.debug_mode) {
                        console.log("Queueing " + command + " for next server connection.");
                    }
                    this.offline_queue.push(command_obj);
                    this.should_buffer = true;
                } else {
                    var not_writeable_error = new Error("send_command: stream not writeable. enable_offline_queue is false");
                    if (command_obj.callback) {
                        command_obj.callback(not_writeable_error);
                    } else {
                        throw not_writeable_error;
                    }
                }
                return false;
            }
            if (command === "subscribe" || command === "psubscribe" || command === "unsubscribe" || command === "punsubscribe") {
                this.pub_sub_command(command_obj);
            } else if (command === "monitor") {
                this.monitoring = true;
            } else if (command === "quit") {
                this.closing = true;
            } else if (this.pub_sub_mode === true) {
                throw new Error("Connection in subscriber mode, only subscriber commands may be used");
            }
            this.command_queue.push(command_obj);
            this.commands_sent += 1;
            elem_count = args.length + 1;
            command_str = "*" + elem_count + "\r\n$" + command.length + "\r\n" + command + "\r\n";
            if (!buffer_args) {
                for (i = 0, il = args.length, arg; i < il; i += 1) {
                    arg = args[i];
                    if (typeof arg !== "string") {
                        arg = String(arg);
                    }
                    command_str += "$" + Buffer.byteLength(arg) + "\r\n" + arg + "\r\n";
                }
                if (exports.debug_mode) {
                    console.log("send " + this.host + ":" + this.port + " id " + this.connection_id + ": " + command_str);
                }
                buffered_writes += !stream.write(command_str);
            } else {
                if (exports.debug_mode) {
                    console.log("send command (" + command_str + ") has Buffer arguments");
                }
                buffered_writes += !stream.write(command_str);
                for (i = 0, il = args.length, arg; i < il; i += 1) {
                    arg = args[i];
                    if (!(Buffer.isBuffer(arg) || arg instanceof String)) {
                        arg = String(arg);
                    }
                    if (Buffer.isBuffer(arg)) {
                        if (arg.length === 0) {
                            if (exports.debug_mode) {
                                console.log("send_command: using empty string for 0 length buffer");
                            }
                            buffered_writes += !stream.write("$0\r\n\r\n");
                        } else {
                            buffered_writes += !stream.write("$" + arg.length + "\r\n");
                            buffered_writes += !stream.write(arg);
                            buffered_writes += !stream.write("\r\n");
                            if (exports.debug_mode) {
                                console.log("send_command: buffer send " + arg.length + " bytes");
                            }
                        }
                    } else {
                        if (exports.debug_mode) {
                            console.log("send_command: string send " + Buffer.byteLength(arg) + " bytes: " + arg);
                        }
                        buffered_writes += !stream.write("$" + Buffer.byteLength(arg) + "\r\n" + arg + "\r\n");
                    }
                }
            }
            if (exports.debug_mode) {
                console.log("send_command buffered_writes: " + buffered_writes, " should_buffer: " + this.should_buffer);
            }
            if (buffered_writes || this.command_queue.getLength() >= this.command_queue_high_water) {
                this.should_buffer = true;
            }
            return !this.should_buffer;
        };
        RedisClient.prototype.pub_sub_command = function(command_obj) {
            var i, key, command, args;
            if (this.pub_sub_mode === false && exports.debug_mode) {
                console.log("Entering pub/sub mode from " + command_obj.command);
            }
            this.pub_sub_mode = true;
            command_obj.sub_command = true;
            command = command_obj.command;
            args = command_obj.args;
            if (command === "subscribe" || command === "psubscribe") {
                if (command === "subscribe") {
                    key = "sub";
                } else {
                    key = "psub";
                }
                for (i = 0; i < args.length; i++) {
                    this.subscription_set[key + " " + args[i]] = true;
                }
            } else {
                if (command === "unsubscribe") {
                    key = "sub";
                } else {
                    key = "psub";
                }
                for (i = 0; i < args.length; i++) {
                    delete this.subscription_set[key + " " + args[i]];
                }
            }
        };
        RedisClient.prototype.end = function() {
            this.stream._events = {};
            this.connected = false;
            this.ready = false;
            this.closing = true;
            return this.stream.destroySoon();
        };
        function Multi(client, args) {
            this._client = client;
            this.queue = [ [ "MULTI" ] ];
            if (Array.isArray(args)) {
                this.queue = this.queue.concat(args);
            }
        }
        exports.Multi = Multi;
        function set_union(seta, setb) {
            var obj = {};
            seta.forEach(function(val) {
                obj[val] = true;
            });
            setb.forEach(function(val) {
                obj[val] = true;
            });
            return Object.keys(obj);
        }
        commands = set_union([ "get", "set", "setnx", "setex", "append", "strlen", "del", "exists", "setbit", "getbit", "setrange", "getrange", "substr", "incr", "decr", "mget", "rpush", "lpush", "rpushx", "lpushx", "linsert", "rpop", "lpop", "brpop", "brpoplpush", "blpop", "llen", "lindex", "lset", "lrange", "ltrim", "lrem", "rpoplpush", "sadd", "srem", "smove", "sismember", "scard", "spop", "srandmember", "sinter", "sinterstore", "sunion", "sunionstore", "sdiff", "sdiffstore", "smembers", "zadd", "zincrby", "zrem", "zremrangebyscore", "zremrangebyrank", "zunionstore", "zinterstore", "zrange", "zrangebyscore", "zrevrangebyscore", "zcount", "zrevrange", "zcard", "zscore", "zrank", "zrevrank", "hset", "hsetnx", "hget", "hmset", "hmget", "hincrby", "hdel", "hlen", "hkeys", "hvals", "hgetall", "hexists", "incrby", "decrby", "getset", "mset", "msetnx", "randomkey", "select", "move", "rename", "renamenx", "expire", "expireat", "keys", "dbsize", "auth", "ping", "echo", "save", "bgsave", "bgrewriteaof", "shutdown", "lastsave", "type", "multi", "exec", "discard", "sync", "flushdb", "flushall", "sort", "info", "monitor", "ttl", "persist", "slaveof", "debug", "config", "subscribe", "unsubscribe", "psubscribe", "punsubscribe", "publish", "watch", "unwatch", "cluster", "restore", "migrate", "dump", "object", "client", "eval", "evalsha" ], require("redis/lib/commands.js"));
        commands.forEach(function(fullCommand) {
            var command = fullCommand.split(" ")[0];
            RedisClient.prototype[command] = function(args, callback) {
                if (Array.isArray(args) && typeof callback === "function") {
                    return this.send_command(command, args, callback);
                } else {
                    return this.send_command(command, to_array(arguments));
                }
            };
            RedisClient.prototype[command.toUpperCase()] = RedisClient.prototype[command];
            Multi.prototype[command] = function() {
                this.queue.push([ command ].concat(to_array(arguments)));
                return this;
            };
            Multi.prototype[command.toUpperCase()] = Multi.prototype[command];
        });
        RedisClient.prototype.select = function(db, callback) {
            var self = this;
            this.send_command("select", [ db ], function(err, res) {
                if (err === null) {
                    self.selected_db = db;
                }
                if (typeof callback === "function") {
                    callback(err, res);
                } else if (err) {
                    self.emit("error", err);
                }
            });
        };
        RedisClient.prototype.SELECT = RedisClient.prototype.select;
        RedisClient.prototype.auth = function() {
            var args = to_array(arguments);
            this.auth_pass = args[0];
            this.auth_callback = args[1];
            if (exports.debug_mode) {
                console.log("Saving auth as " + this.auth_pass);
            }
            if (this.connected) {
                this.send_command("auth", args);
            }
        };
        RedisClient.prototype.AUTH = RedisClient.prototype.auth;
        RedisClient.prototype.hmget = function(arg1, arg2, arg3) {
            if (Array.isArray(arg2) && typeof arg3 === "function") {
                return this.send_command("hmget", [ arg1 ].concat(arg2), arg3);
            } else if (Array.isArray(arg1) && typeof arg2 === "function") {
                return this.send_command("hmget", arg1, arg2);
            } else {
                return this.send_command("hmget", to_array(arguments));
            }
        };
        RedisClient.prototype.HMGET = RedisClient.prototype.hmget;
        RedisClient.prototype.hmset = function(args, callback) {
            var tmp_args, tmp_keys, i, il, key;
            if (Array.isArray(args) && typeof callback === "function") {
                return this.send_command("hmset", args, callback);
            }
            args = to_array(arguments);
            if (typeof args[args.length - 1] === "function") {
                callback = args[args.length - 1];
                args.length -= 1;
            } else {
                callback = null;
            }
            if (args.length === 2 && (typeof args[0] === "string" || typeof args[0] === "number") && typeof args[1] === "object") {
                if (typeof args[0] === "number") {
                    args[0] = args[0].toString();
                }
                tmp_args = [ args[0] ];
                tmp_keys = Object.keys(args[1]);
                for (i = 0, il = tmp_keys.length; i < il; i++) {
                    key = tmp_keys[i];
                    tmp_args.push(key);
                    tmp_args.push(args[1][key]);
                }
                args = tmp_args;
            }
            return this.send_command("hmset", args, callback);
        };
        RedisClient.prototype.HMSET = RedisClient.prototype.hmset;
        Multi.prototype.hmset = function() {
            var args = to_array(arguments), tmp_args;
            if (args.length >= 2 && typeof args[0] === "string" && typeof args[1] === "object") {
                tmp_args = [ "hmset", args[0] ];
                Object.keys(args[1]).map(function(key) {
                    tmp_args.push(key);
                    tmp_args.push(args[1][key]);
                });
                if (args[2]) {
                    tmp_args.push(args[2]);
                }
                args = tmp_args;
            } else {
                args.unshift("hmset");
            }
            this.queue.push(args);
            return this;
        };
        Multi.prototype.HMSET = Multi.prototype.hmset;
        Multi.prototype.exec = function(callback) {
            var self = this;
            var errors = [];
            this.queue.forEach(function(args, index) {
                var command = args[0], obj;
                if (typeof args[args.length - 1] === "function") {
                    args = args.slice(1, -1);
                } else {
                    args = args.slice(1);
                }
                if (args.length === 1 && Array.isArray(args[0])) {
                    args = args[0];
                }
                if (command.toLowerCase() === "hmset" && typeof args[1] === "object") {
                    obj = args.pop();
                    Object.keys(obj).forEach(function(key) {
                        args.push(key);
                        args.push(obj[key]);
                    });
                }
                this._client.send_command(command, args, function(err, reply) {
                    if (err) {
                        var cur = self.queue[index];
                        if (typeof cur[cur.length - 1] === "function") {
                            cur[cur.length - 1](err);
                        } else {
                            errors.push(new Error(err));
                        }
                    }
                });
            }, this);
            return this._client.send_command("EXEC", [], function(err, replies) {
                if (err) {
                    if (callback) {
                        errors.push(new Error(err));
                        callback(errors);
                        return;
                    } else {
                        throw new Error(err);
                    }
                }
                var i, il, reply, args;
                if (replies) {
                    for (i = 1, il = self.queue.length; i < il; i += 1) {
                        reply = replies[i - 1];
                        args = self.queue[i];
                        if (reply && args[0].toLowerCase() === "hgetall") {
                            replies[i - 1] = reply = reply_to_object(reply);
                        }
                        if (typeof args[args.length - 1] === "function") {
                            args[args.length - 1](null, reply);
                        }
                    }
                }
                if (callback) {
                    callback(null, replies);
                }
            });
        };
        Multi.prototype.EXEC = Multi.prototype.exec;
        RedisClient.prototype.multi = function(args) {
            return new Multi(this, args);
        };
        RedisClient.prototype.MULTI = function(args) {
            return new Multi(this, args);
        };
        var eval_orig = RedisClient.prototype.eval;
        RedisClient.prototype.eval = RedisClient.prototype.EVAL = function() {
            var self = this, args = to_array(arguments), callback;
            if (typeof args[args.length - 1] === "function") {
                callback = args.pop();
            }
            if (Array.isArray(args[0])) {
                args = args[0];
            }
            var source = args[0];
            args[0] = crypto.createHash("sha1").update(source).digest("hex");
            self.evalsha(args, function(err, reply) {
                if (err && /NOSCRIPT/.test(err.message)) {
                    args[0] = source;
                    eval_orig.call(self, args, callback);
                } else if (callback) {
                    callback(err, reply);
                }
            });
        };
        exports.createClient = function(port_arg, host_arg, options) {
            var port = port_arg || default_port, host = host_arg || default_host, redis_client, net_client;
            net_client = net.createConnection(port, host);
            redis_client = new RedisClient(net_client, options);
            redis_client.port = port;
            redis_client.host = host;
            return redis_client;
        };
        exports.print = function(err, reply) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("Reply: " + reply);
            }
        };
        return module.exports;
    });
    define("fibers/future.js", function(require, module, exports, __dirname, __filename) {
        "use strict";
        var Fiber = require("fibers/fibers.js");
        var util = require("util");
        module.exports = Future;
        Function.prototype.future = function() {
            var fn = this;
            var ret = function() {
                return new FiberFuture(fn, this, arguments);
            };
            ret.toString = function() {
                return "<<Future " + fn + ".future()>>";
            };
            return ret;
        };
        function Future() {}
        Future.wrap = function(fn, idx) {
            idx = idx === undefined ? fn.length - 1 : idx;
            return function() {
                var args = Array.prototype.slice.call(arguments);
                if (args.length > idx) {
                    throw new Error("function expects no more than " + idx + " arguments");
                }
                var future = new Future;
                args[idx] = future.resolver();
                fn.apply(this, args);
                return future;
            };
        };
        Future.wait = function wait() {
            var futures = [], singleFiberFuture;
            for (var ii = 0; ii < arguments.length; ++ii) {
                var arg = arguments[ii];
                if (arg instanceof Future) {
                    if (arg.isResolved()) {
                        continue;
                    }
                    if (!singleFiberFuture && arg instanceof FiberFuture && !arg.started) {
                        singleFiberFuture = arg;
                        continue;
                    }
                    futures.push(arg);
                } else if (arg instanceof Array) {
                    for (var jj = 0; jj < arg.length; ++jj) {
                        var aarg = arg[jj];
                        if (aarg instanceof Future) {
                            if (aarg.isResolved()) {
                                continue;
                            }
                            if (!singleFiberFuture && aarg instanceof FiberFuture && !aarg.started) {
                                singleFiberFuture = aarg;
                                continue;
                            }
                            futures.push(aarg);
                        } else {
                            throw new Error(aarg + " is not a future");
                        }
                    }
                } else {
                    throw new Error(arg + " is not a future");
                }
            }
            var fiber = Fiber.current;
            if (!fiber) {
                throw new Error("Can't wait without a fiber");
            }
            var pending = futures.length + (singleFiberFuture ? 1 : 0);
            function cb() {
                if (!--pending) {
                    fiber.run();
                }
            }
            for (var ii = 0; ii < futures.length; ++ii) {
                futures[ii].resolve(cb);
            }
            if (singleFiberFuture) {
                singleFiberFuture.started = true;
                try {
                    singleFiberFuture.return(singleFiberFuture.fn.apply(singleFiberFuture.context, singleFiberFuture.args));
                } catch (e) {
                    singleFiberFuture.throw(e);
                }
                --pending;
            }
            if (pending) {
                Fiber.yield();
            }
        };
        Future.prototype = {
            get: function() {
                if (!this.resolved) {
                    throw new Error("Future must resolve before value is ready");
                } else if (this.error) {
                    var stack = {}, error = this.error instanceof Object ? this.error : new Error(this.error);
                    var longError = Object.create(error);
                    Error.captureStackTrace(stack, Future.prototype.get);
                    Object.defineProperty(longError, "stack", {
                        get: function() {
                            var baseStack = error.stack;
                            if (baseStack) {
                                baseStack = baseStack.split("\n");
                                return [ baseStack[0] ].concat(stack.stack.split("\n").slice(1)).concat("    - - - - -").concat(baseStack.slice(1)).join("\n");
                            } else {
                                return stack.stack;
                            }
                        },
                        enumerable: true
                    });
                    throw longError;
                } else {
                    return this.value;
                }
            },
            "return": function(value) {
                if (this.resolved) {
                    throw new Error("Future resolved more than once");
                }
                this.value = value;
                this.resolved = true;
                var callbacks = this.callbacks;
                if (callbacks) {
                    delete this.callbacks;
                    for (var ii = 0; ii < callbacks.length; ++ii) {
                        try {
                            var ref = callbacks[ii];
                            if (ref[1]) {
                                ref[1](value);
                            } else {
                                ref[0](undefined, value);
                            }
                        } catch (ex) {
                            process.nextTick(function() {
                                throw ex;
                            });
                        }
                    }
                }
            },
            "throw": function(error) {
                if (this.resolved) {
                    throw new Error("Future resolved more than once");
                } else if (!error) {
                    throw new Error("Must throw non-empty error");
                }
                this.error = error;
                this.resolved = true;
                var callbacks = this.callbacks;
                if (callbacks) {
                    delete this.callbacks;
                    for (var ii = 0; ii < callbacks.length; ++ii) {
                        try {
                            var ref = callbacks[ii];
                            if (ref[1]) {
                                ref[0].throw(error);
                            } else {
                                ref[0](error);
                            }
                        } catch (ex) {
                            process.nextTick(function() {
                                throw ex;
                            });
                        }
                    }
                }
            },
            detach: function() {
                this.resolve(function(err) {
                    if (err) {
                        throw err;
                    }
                });
            },
            isResolved: function() {
                return this.resolved === true;
            },
            resolver: function() {
                return function(err, val) {
                    if (err) {
                        this.throw(err);
                    } else {
                        this.return(val);
                    }
                }.bind(this);
            },
            resolve: function(arg1, arg2) {
                if (this.resolved) {
                    if (arg2) {
                        if (this.error) {
                            arg1.throw(this.error);
                        } else {
                            arg2(this.value);
                        }
                    } else {
                        arg1(this.error, this.value);
                    }
                } else {
                    (this.callbacks = this.callbacks || []).push([ arg1, arg2 ]);
                }
                return this;
            },
            resolveSuccess: function(cb) {
                this.resolve(function(err, val) {
                    if (err) {
                        return;
                    }
                    cb(val);
                });
                return this;
            },
            proxy: function(future) {
                this.resolve(function(err, val) {
                    if (err) {
                        future.throw(err);
                    } else {
                        future.return(val);
                    }
                });
            },
            proxyErrors: function(futures) {
                this.resolve(function(err) {
                    if (!err) {
                        return;
                    }
                    if (futures instanceof Array) {
                        for (var ii = 0; ii < futures.length; ++ii) {
                            futures[ii].throw(err);
                        }
                    } else {
                        futures.throw(err);
                    }
                });
                return this;
            },
            wait: function() {
                if (this.isResolved()) {
                    return this.get();
                }
                Future.wait(this);
                return this.get();
            }
        };
        function FiberFuture(fn, context, args) {
            this.fn = fn;
            this.context = context;
            this.args = args;
            this.started = false;
            var that = this;
            process.nextTick(function() {
                if (!that.started) {
                    that.started = true;
                    Fiber(function() {
                        try {
                            that.return(fn.apply(context, args));
                        } catch (e) {
                            that.throw(e);
                        }
                    }).run();
                }
            });
        }
        util.inherits(FiberFuture, Future);
        return module.exports;
    });
    define("plan9-backend/lib/storm/bolt.js", function(require, module, exports, __dirname, __filename) {
        var EventEmitter = require("events").EventEmitter;
        var Protocol = require("plan9-backend/lib/storm/protocol.js").MultilangProtocol;
        var Tuple = require("plan9-backend/lib/storm/tuple.js").Tuple;
        var Bolt = module.exports.Bolt = function(definitionFn, inputStream, outputStream) {
            this._events = new EventEmitter;
            this._definitionFn = definitionFn || function() {};
            this._processTupleFn = null;
            this._ready = false;
            this._protocol = new Protocol(inputStream, outputStream);
            this._handleEvents();
            this._outputCollector = this._getOutputCollector();
        };
        Bolt.prototype._handleEvents = function() {
            var self = this;
            this._protocol.on("error", function(err) {
                self._events.emit("error", err);
            });
            this._protocol.on("ready", function() {
                self._ready = true;
                self._processTupleFn = self._definitionFn(self._events);
                self._events.emit("prepare", self._outputCollector);
            });
            this._protocol.on("message", function(message) {
                if (message && !!message.tuple) {
                    var id = message.id || null;
                    var comp = message.comp || null;
                    var stream = message.stream || null;
                    var task = message.task || null;
                    var tuple = message.tuple || null;
                    self._processTupleFn(new Tuple(id, comp, stream, task, tuple), function(err) {
                        if (err) {
                            self._protocol.sendLog(err);
                        }
                    });
                }
            });
        };
        Bolt.prototype._getOutputCollector = function() {
            var self = this;
            var collector = function() {};
            collector.prototype.emit = function(tuple, stream, anchors) {
                self._protocol.emitTuple(tuple, stream, anchors, null);
            };
            collector.prototype.emitDirect = function(directTask, tuple, stream, anchors) {
                self._protocol.emitTuple(tuple, stream, anchors, directTask);
            };
            collector.prototype.ack = function(tuple) {
                if (tuple instanceof Tuple) {
                    self._protocol.sendMessage({
                        command: "ack",
                        id: tuple.id
                    });
                }
            };
            collector.prototype.fail = function(tuple) {
                if (tuple instanceof Tuple) {
                    self._protocol.sendMessage({
                        command: "fail",
                        id: tuple.id
                    });
                }
            };
            collector.prototype.reportError = function(err) {
                self._protocol.sendLog(JSON.stringify(err));
            };
            return new collector;
        };
        return module.exports;
    });
    define("plan9-backend/lib/storm/spout.js", function(require, module, exports, __dirname, __filename) {
        var EventEmitter = require("events").EventEmitter;
        var Protocol = require("plan9-backend/lib/storm/protocol.js").MultilangProtocol;
        var Spout = module.exports.Spout = function(definitionFn, inputStream, outputStream) {
            this._events = new EventEmitter;
            this._definitionFn = definitionFn || function() {};
            this._nextTupleFn = null;
            this._ready = false;
            this._protocol = new Protocol(inputStream, outputStream);
            this._handleEvents();
            this._outputCollector = this._getOutputCollector();
        };
        Spout.prototype._handleEvents = function() {
            var self = this;
            this._protocol.on("error", function(err) {
                self._events.emit("error", err);
            });
            this._protocol.on("ready", function() {
                self._ready = true;
                self._nextTupleFn = self._definitionFn(self._events);
                self._events.emit("open", self._outputCollector);
            });
            this._protocol.on("message", function(message) {
                if (message && !!message.command) {
                    if (message.command === "next") {
                        self._protocol.sendLog("next");
                        self._nextTupleFn(function(err) {
                            if (err) {
                                self._protocol.sendLog(err);
                            }
                            self._protocol.sendSync();
                        });
                    } else if (message.command === "ack") {
                        self._protocol.sendMessage({
                            command: "ack",
                            id: message.id
                        });
                        self._protocol.sendSync();
                        self._events.emit("ack", message.id);
                    } else if (message.command === "fail") {
                        self._protocol.sendMessage({
                            command: "fail",
                            id: message.id
                        });
                        self._protocol.sendSync();
                        self._events.emit("fail", message.id);
                    }
                }
            });
        };
        Spout.prototype._getOutputCollector = function() {
            var self = this;
            var collector = function() {};
            var emitTuple = function(tuple, messageId, streamId, directTask) {
                var command = {
                    command: "emit"
                };
                if (messageId) {
                    command["id"] = messageId;
                }
                if (streamId) {
                    command["stream"] = streamId;
                }
                if (directTask) {
                    command["task"] = directTask;
                }
                command["tuple"] = tuple;
                self._protocol.sendMessage(command);
            };
            collector.prototype.emit = function(tuple, messageId, streamId) {
                emitTuple(tuple, messageId, streamId, null);
            };
            collector.prototype.emitDirect = function(directTask, tuple, messageId, streamId) {
                emitTuple(tuple, messageId, streamId, directTask);
            };
            return new collector;
        };
        return module.exports;
    });
    define("plan9-backend/lib/storm/tuple.js", function(require, module, exports, __dirname, __filename) {
        var Tuple = module.exports.Tuple = function(id, component, stream, task, values) {
            this.id = id;
            this.component = component;
            this.stream = stream;
            this.task = task;
            this.values = values;
        };
        return module.exports;
    });
    define("redis/lib/util.js", function(require, module, exports, __dirname, __filename) {
        var util;
        try {
            util = require("util");
        } catch (err) {
            util = require("sys");
        }
        module.exports = util;
        return module.exports;
    });
    define("redis/lib/queue.js", function(require, module, exports, __dirname, __filename) {
        function Queue() {
            this.tail = [];
            this.head = [];
            this.offset = 0;
        }
        Queue.prototype.shift = function() {
            if (this.offset === this.head.length) {
                var tmp = this.head;
                tmp.length = 0;
                this.head = this.tail;
                this.tail = tmp;
                this.offset = 0;
                if (this.head.length === 0) {
                    return;
                }
            }
            return this.head[this.offset++];
        };
        Queue.prototype.push = function(item) {
            return this.tail.push(item);
        };
        Queue.prototype.forEach = function(fn, thisv) {
            var array = this.head.slice(this.offset), i, il;
            array.push.apply(array, this.tail);
            if (thisv) {
                for (i = 0, il = array.length; i < il; i += 1) {
                    fn.call(thisv, array[i], i, array);
                }
            } else {
                for (i = 0, il = array.length; i < il; i += 1) {
                    fn(array[i], i, array);
                }
            }
            return array;
        };
        Queue.prototype.getLength = function() {
            return this.head.length - this.offset + this.tail.length;
        };
        Object.defineProperty(Queue.prototype, "length", {
            get: function() {
                return this.getLength();
            }
        });
        if (typeof module !== "undefined" && module.exports) {
            module.exports = Queue;
        }
        return module.exports;
    });
    define("redis/lib/to_array.js", function(require, module, exports, __dirname, __filename) {
        function to_array(args) {
            var len = args.length, arr = new Array(len), i;
            for (i = 0; i < len; i += 1) {
                arr[i] = args[i];
            }
            return arr;
        }
        module.exports = to_array;
        return module.exports;
    });
    define("redis/lib/parser/hiredis.js", function(require, module, exports, __dirname, __filename) {
        var events = require("events"), util = require("redis/lib/util.js"), hiredis = require("hiredis/hiredis.js");
        exports.debug_mode = false;
        exports.name = "hiredis/hiredis.js";
        function HiredisReplyParser(options) {
            this.name = exports.name;
            this.options = options || {};
            this.reset();
            events.EventEmitter.call(this);
        }
        util.inherits(HiredisReplyParser, events.EventEmitter);
        exports.Parser = HiredisReplyParser;
        HiredisReplyParser.prototype.reset = function() {
            this.reader = new hiredis.Reader({
                return_buffers: this.options.return_buffers || false
            });
        };
        HiredisReplyParser.prototype.execute = function(data) {
            var reply;
            this.reader.feed(data);
            while (true) {
                try {
                    reply = this.reader.get();
                } catch (err) {
                    this.emit("error", err);
                    break;
                }
                if (reply === undefined) {
                    break;
                }
                if (reply && reply.constructor === Error) {
                    this.emit("reply error", reply);
                } else {
                    this.emit("reply", reply);
                }
            }
        };
        return module.exports;
    });
    define("redis/lib/parser/javascript.js", function(require, module, exports, __dirname, __filename) {
        var events = require("events"), util = require("redis/lib/util.js");
        function Packet(type, size) {
            this.type = type;
            this.size = +size;
        }
        exports.name = "javascript";
        exports.debug_mode = false;
        function ReplyParser(options) {
            this.name = exports.name;
            this.options = options || {};
            this._buffer = null;
            this._offset = 0;
            this._encoding = "utf-8";
            this._debug_mode = options.debug_mode;
            this._reply_type = null;
        }
        util.inherits(ReplyParser, events.EventEmitter);
        exports.Parser = ReplyParser;
        function IncompleteReadBuffer(message) {
            this.name = "IncompleteReadBuffer";
            this.message = message;
        }
        util.inherits(IncompleteReadBuffer, Error);
        function small_toString(buf, start, end) {
            var tmp = "", i;
            for (i = start; i < end; i++) {
                tmp += String.fromCharCode(buf[i]);
            }
            return tmp;
        }
        ReplyParser.prototype._parseResult = function(type) {
            var start, end, offset, packetHeader;
            if (type === 43 || type === 45) {
                end = this._packetEndOffset() - 1;
                start = this._offset;
                this._offset = end + 2;
                if (end > this._buffer.length) {
                    this._offset = start;
                    throw new IncompleteReadBuffer("Wait for more data.");
                }
                if (this.options.return_buffers) {
                    return this._buffer.slice(start, end);
                } else {
                    if (end - start < 65536) {
                        return small_toString(this._buffer, start, end);
                    } else {
                        return this._buffer.toString(this._encoding, start, end);
                    }
                }
            } else if (type === 58) {
                end = this._packetEndOffset() - 1;
                start = this._offset;
                this._offset = end + 2;
                if (end > this._buffer.length) {
                    this._offset = start;
                    throw new IncompleteReadBuffer("Wait for more data.");
                }
                if (this.options.return_buffers) {
                    return this._buffer.slice(start, end);
                }
                return +small_toString(this._buffer, start, end);
            } else if (type === 36) {
                offset = this._offset - 1;
                packetHeader = new Packet(type, this.parseHeader());
                if (packetHeader.size === -1) {
                    return undefined;
                }
                end = this._offset + packetHeader.size;
                start = this._offset;
                this._offset = end + 2;
                if (end > this._buffer.length) {
                    this._offset = offset;
                    throw new IncompleteReadBuffer("Wait for more data.");
                }
                if (this.options.return_buffers) {
                    return this._buffer.slice(start, end);
                } else {
                    return this._buffer.toString(this._encoding, start, end);
                }
            } else if (type === 42) {
                offset = this._offset;
                packetHeader = new Packet(type, this.parseHeader());
                if (packetHeader.size < 0) {
                    return null;
                }
                if (packetHeader.size > this._bytesRemaining()) {
                    this._offset = offset - 1;
                    throw new IncompleteReadBuffer("Wait for more data.");
                }
                var reply = [];
                var ntype, i, res;
                offset = this._offset - 1;
                for (i = 0; i < packetHeader.size; i++) {
                    ntype = this._buffer[this._offset++];
                    if (this._offset > this._buffer.length) {
                        throw new IncompleteReadBuffer("Wait for more data.");
                    }
                    res = this._parseResult(ntype);
                    if (res === undefined) {
                        res = null;
                    }
                    reply.push(res);
                }
                return reply;
            }
        };
        ReplyParser.prototype.execute = function(buffer) {
            this.append(buffer);
            var type, ret, offset;
            while (true) {
                offset = this._offset;
                try {
                    if (this._bytesRemaining() < 4) {
                        break;
                    }
                    type = this._buffer[this._offset++];
                    if (type === 43) {
                        ret = this._parseResult(type);
                        if (ret === null) {
                            break;
                        }
                        this.send_reply(ret);
                    } else if (type === 45) {
                        ret = this._parseResult(type);
                        if (ret === null) {
                            break;
                        }
                        this.send_error(ret);
                    } else if (type === 58) {
                        ret = this._parseResult(type);
                        if (ret === null) {
                            break;
                        }
                        this.send_reply(ret);
                    } else if (type === 36) {
                        ret = this._parseResult(type);
                        if (ret === null) {
                            break;
                        }
                        if (ret === undefined) {
                            ret = null;
                        }
                        this.send_reply(ret);
                    } else if (type === 42) {
                        offset = this._offset - 1;
                        ret = this._parseResult(type);
                        this.send_reply(ret);
                    }
                } catch (err) {
                    if (!(err instanceof IncompleteReadBuffer)) {
                        throw err;
                    }
                    this._offset = offset;
                    break;
                }
            }
        };
        ReplyParser.prototype.append = function(newBuffer) {
            if (!newBuffer) {
                return;
            }
            if (this._buffer === null) {
                this._buffer = newBuffer;
                return;
            }
            if (this._offset >= this._buffer.length) {
                this._buffer = newBuffer;
                this._offset = 0;
                return;
            }
            if (Buffer.concat !== undefined) {
                this._buffer = Buffer.concat([ this._buffer.slice(this._offset), newBuffer ]);
            } else {
                var remaining = this._bytesRemaining(), newLength = remaining + newBuffer.length, tmpBuffer = new Buffer(newLength);
                this._buffer.copy(tmpBuffer, 0, this._offset);
                newBuffer.copy(tmpBuffer, remaining, 0);
                this._buffer = tmpBuffer;
            }
            this._offset = 0;
        };
        ReplyParser.prototype.parseHeader = function() {
            var end = this._packetEndOffset(), value = small_toString(this._buffer, this._offset, end - 1);
            this._offset = end + 1;
            return value;
        };
        ReplyParser.prototype._packetEndOffset = function() {
            var offset = this._offset;
            while (this._buffer[offset] !== 13 && this._buffer[offset + 1] !== 10) {
                offset++;
                if (offset >= this._buffer.length) {
                    throw new IncompleteReadBuffer("didn't see LF after NL reading multi bulk count (" + offset + " => " + this._buffer.length + ", " + this._offset + ")");
                }
            }
            offset++;
            return offset;
        };
        ReplyParser.prototype._bytesRemaining = function() {
            return this._buffer.length - this._offset < 0 ? 0 : this._buffer.length - this._offset;
        };
        ReplyParser.prototype.parser_error = function(message) {
            this.emit("error", message);
        };
        ReplyParser.prototype.send_error = function(reply) {
            this.emit("reply error", reply);
        };
        ReplyParser.prototype.send_reply = function(reply) {
            this.emit("reply", reply);
        };
        return module.exports;
    });
    define("redis/lib/commands.js", function(require, module, exports, __dirname, __filename) {
        module.exports = [ "append", "auth", "bgrewriteaof", "bgsave", "bitcount", "bitop", "bitpos", "blpop", "brpop", "brpoplpush", "client kill", "client list", "client getname", "client pause", "client setname", "config get", "config rewrite", "config set", "config resetstat", "dbsize", "debug object", "debug segfault", "decr", "decrby", "del", "discard", "dump", "echo", "eval", "evalsha", "exec", "exists", "expire", "expireat", "flushall", "flushdb", "get", "getbit", "getrange", "getset", "hdel", "hexists", "hget", "hgetall", "hincrby", "hincrbyfloat", "hkeys", "hlen", "hmget", "hmset", "hset", "hsetnx", "hvals", "incr", "incrby", "incrbyfloat", "info", "keys", "lastsave", "lindex", "linsert", "llen", "lpop", "lpush", "lpushx", "lrange", "lrem", "lset", "ltrim", "mget", "migrate", "monitor", "move", "mset", "msetnx", "multi", "object", "persist", "pexpire", "pexpireat", "pfadd", "pfcount", "pfmerge", "ping", "psetex", "psubscribe", "pubsub", "pttl", "publish", "punsubscribe", "quit", "randomkey", "rename", "renamenx", "restore", "rpop", "rpoplpush", "rpush", "rpushx", "sadd", "save", "scard", "script exists", "script flush", "script kill", "script load", "sdiff", "sdiffstore", "select", "set", "setbit", "setex", "setnx", "setrange", "shutdown", "sinter", "sinterstore", "sismember", "slaveof", "slowlog", "smembers", "smove", "sort", "spop", "srandmember", "srem", "strlen", "subscribe", "sunion", "sunionstore", "sync", "time", "ttl", "type", "unsubscribe", "unwatch", "watch", "zadd", "zcard", "zcount", "zincrby", "zinterstore", "zlexcount", "zrange", "zrangebylex", "zrangebyscore", "zrank", "zrem", "zremrangebylex", "zremrangebyrank", "zremrangebyscore", "zrevrange", "zrevrangebyscore", "zrevrank", "zscore", "zunionstore", "scan", "sscan", "hscan", "zscan" ];
        return module.exports;
    });
    define("fibers/fibers.js", function(require, module, exports, __dirname, __filename) {
        var fs = require("fs"), path = require("path");
        Math.random();
        var v8 = "v8-" + /[0-9]+\.[0-9]+/.exec(process.versions.v8)[0];
        var modPath = path.join("/usr/local/lib/node_modules/fibers", "bin", process.platform + "-" + process.arch + "-" + v8, "fibers");
        try {
            fs.statSync(modPath + ".node");
        } catch (ex) {
            throw new Error("`" + modPath + ".node` is missing. Try reinstalling `node-fibers`?");
        }
        module.exports = require(modPath).Fiber;
        return module.exports;
    });
    define("plan9-backend/lib/storm/protocol.js", function(require, module, exports, __dirname, __filename) {
        var fs = require("fs");
        var util = require("util");
        var EventEmitter = require("events").EventEmitter;
        var Protocol = module.exports.MultilangProtocol = function(inputStream, outputStream) {
            this._inputStream = inputStream;
            this._outputStream = outputStream;
            this._msgs = [];
            this._heartbeatDir = null;
            this._stormConf = null;
            this._topologyContext = null;
            this._readMessages();
            EventEmitter.call(this);
        };
        util.inherits(Protocol, EventEmitter);
        Protocol.prototype._readMessages = function() {
            var self = this;
            this._inputStream.on("data", function(chunk) {
                if (chunk instanceof Buffer) {
                    chunk = chunk.toString();
                }
                var chunks = chunk.split("\n");
                var last_end = 0;
                self._msgs = self._msgs.concat(chunks);
                for (var i in self._msgs) {
                    if (self._msgs[i] == "end") {
                        self._onMessage(self._msgs.slice(last_end, i).join("\n").trim());
                        last_end = parseInt(i) + 1;
                    }
                }
                self._msgs.splice(0, last_end);
            });
        };
        Protocol.prototype._onMessage = function(message) {
            if (!message) return;
            try {
                parsedMessage = JSON.parse(message);
                if (!parsedMessage) return;
                if (parsedMessage.command != undefined || parsedMessage.tuple != undefined) {
                    this.emit("message", parsedMessage);
                    return;
                }
                if (parsedMessage.pidDir) {
                    this._heartbeatDir = parsedMessage.pidDir;
                    this._sendPid(this._heartbeatDir);
                }
                if (parsedMessage.conf) {
                    this._stormConf = parsedMessage.conf;
                }
                if (parsedMessage.context) {
                    this._topologyContext = message;
                    if (this._heartbeatDir && this._stormConf) {
                        this.emit("ready", this._topologyContext);
                    }
                }
            } catch (e) {
                conole.log("ERROR!! " + e);
                this.emit("error", e);
                return;
            }
        };
        Protocol.prototype._sendPid = function(heartbeatDir) {
            var pid = process.pid;
            this._outputStream.write('{"pid":' + pid + "}\nend\n");
            fs.open(heartbeatDir + "/" + pid, "w", function(err, fd) {
                if (!err) {
                    fs.close(fd);
                }
            });
        };
        Protocol.prototype.sendMessage = function(message) {
            var messageString = JSON.stringify(message);
            this._outputStream.write(messageString + "\nend\n");
        };
        Protocol.prototype.sendLog = function(message) {
            this.sendMessage({
                command: "log",
                msg: message
            });
        };
        Protocol.prototype.sendSync = function() {
            this.sendMessage({
                command: "sync"
            });
        };
        Protocol.prototype.getStormConf = function() {
            return this._stormConf;
        };
        Protocol.prototype.getTopologyContext = function() {
            return this._topologyContext;
        };
        Protocol.prototype.emitTuple = function(tuple, stream, anchors, directTask) {
            if (!anchors) anchors = [];
            var message = {
                command: "emit"
            };
            if (stream) {
                message.stream = stream;
            }
            if (directTask) {
                message.task = directTask;
            }
            message.anchors = anchors.map(function(anchor) {
                return anchor.id;
            });
            message.tuple = tuple;
            this.sendMessage(message);
        };
        return module.exports;
    });
    define("hiredis/hiredis.js", function(require, module, exports, __dirname, __filename) {
        var net = require("net"), hiredis = require("bindings/bindings.js")("hiredis.node");
        exports.Reader = hiredis.Reader;
        exports.createConnection = function(port, host) {
            var s = net.createConnection(port || 6379, host);
            var r = new hiredis.Reader;
            var _write = s.write;
            s.write = function() {
                var i, args = arguments;
                _write.call(s, "*" + args.length + "\r\n");
                for (i = 0; i < args.length; i++) {
                    var arg = args[i];
                    _write.call(s, "$" + arg.length + "\r\n" + arg + "\r\n");
                }
            };
            s.on("data", function(data) {
                var reply;
                r.feed(data);
                try {
                    while ((reply = r.get()) !== undefined) s.emit("reply", reply);
                } catch (err) {
                    r = null;
                    s.emit("error", err);
                    s.destroy();
                }
            });
            return s;
        };
        return module.exports;
    });
    define("bindings/bindings.js", function(require, module, exports, __dirname, __filename) {
        var fs = require("fs"), path = require("path"), join = path.join, dirname = path.dirname, exists = fs.existsSync || path.existsSync, defaults = {
            arrow: process.env.NODE_BINDINGS_ARROW || " \u2192 ",
            compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
            platform: process.platform,
            arch: process.arch,
            version: process.versions.node,
            bindings: "bindings.node",
            "try": [ [ "module_root", "build", "bindings" ], [ "module_root", "build", "Debug", "bindings" ], [ "module_root", "build", "Release", "bindings" ], [ "module_root", "out", "Debug", "bindings" ], [ "module_root", "Debug", "bindings" ], [ "module_root", "out", "Release", "bindings" ], [ "module_root", "Release", "bindings" ], [ "module_root", "build", "default", "bindings" ], [ "module_root", "compiled", "version", "platform", "arch", "bindings" ] ]
        };
        function bindings(opts) {
            if (typeof opts == "string") {
                opts = {
                    bindings: opts
                };
            } else if (!opts) {
                opts = {};
            }
            opts.__proto__ = defaults;
            if (!opts.module_root) {
                opts.module_root = exports.getRoot(exports.getFileName());
            }
            if (path.extname(opts.bindings) != ".node") {
                opts.bindings += ".node";
            }
            var tries = [], i = 0, l = opts.try.length, n, b, err;
            for (; i < l; i++) {
                n = join.apply(null, opts.try[i].map(function(p) {
                    return opts[p] || p;
                }));
                tries.push(n);
                try {
                    b = opts.path ? require.resolve(n) : require(n);
                    if (!opts.path) {
                        b.path = n;
                    }
                    return b;
                } catch (e) {
                    if (!/not find/i.test(e.message)) {
                        throw e;
                    }
                }
            }
            err = new Error("Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
                return opts.arrow + a;
            }).join("\n"));
            err.tries = tries;
            throw err;
        }
        module.exports = exports = bindings;
        exports.getFileName = function getFileName(calling_file) {
            var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
            Error.stackTraceLimit = 10;
            Error.prepareStackTrace = function(e, st) {
                for (var i = 0, l = st.length; i < l; i++) {
                    fileName = st[i].getFileName();
                    if (fileName !== __filename) {
                        if (calling_file) {
                            if (fileName !== calling_file) {
                                return;
                            }
                        } else {
                            return;
                        }
                    }
                }
            };
            Error.captureStackTrace(dummy);
            dummy.stack;
            Error.prepareStackTrace = origPST;
            Error.stackTraceLimit = origSTL;
            return fileName;
        };
        exports.getRoot = function getRoot(file) {
            var dir = dirname(file), prev;
            while (true) {
                if (dir === ".") {
                    dir = process.cwd();
                }
                if (exists(join(dir, "package.json")) || exists(join(dir, "node_modules"))) {
                    return dir;
                }
                if (prev === dir) {
                    throw new Error('Could not find module root given file: "' + file + '". Do you have a `package.json` file? ');
                }
                prev = dir;
                dir = join(dir, "..");
            }
        };
        return module.exports;
    });
    var entries = [ "plan9-backend/src/plan9/bolts/ExtendedKittenRobbersBolt.js" ];
    for (var i = entries.length; i--; ) {
        _require(entries[i]);
    }
})();
