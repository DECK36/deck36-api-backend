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

var events = require('events')
    , config = require('config')
    , logger = require('../modules').logger
    , async = require('async');

/**
 *
 * Connect to redis looks up the keyListPixelFree and does the pixel stuff on the lists in redis
 *
 * @param {redis} redisClient
 * @param {string} keyListPixelFree
 *
 * @constructor
 */
function CbtCalculator(redisClient, keyListPixelFree, keyListPixelLock, keyListPixelSolved, keyListPixelLockUserPrefix) {

    /**
     * @type {string}
     */
    keyListPixelFree = typeof keyListPixelFree == "string" ? keyListPixelFree : 'plan9_pixel_free';

    /**
     * @type {string}
     */
    keyListPixelLock = typeof keyListPixelLock == "string" ? keyListPixelLock : 'plan9_pixel_lock';

    /**
     * @type {string}
     */
    keyListPixelSolved = typeof keyListPixelSolved == "string" ? keyListPixelSolved : 'plan9_pixel_solved';

    /**
     * @type {string}
     */
    keyListPixelLockUserPrefix = typeof keyListPixelLockUserPrefix == "string" ? keyListPixelLockUserPrefix : 'plan9_pixel_lock_user_';

    if (typeof redisClient !== "object") {
        throw "redisClient is needed";
    }

    /**
     * take (randomized) one pixel from keyListPixelFree and add it to pixel_lock and user_lock (but don't remove)
     *
     * @param {function} callback(err, message)
     *
     * @type {*|function(this:CbtCalculator)}
     *
     */
    this.getStartPixel = function(callback) {
        redisClient.SPOP(keyListPixelFree, function(err, result) {
            logger.debug('CbtCalculator - getStartPixel - error or SPOP: ', err);
            logger.debug('CbtCalculator - getStartPixel - result of SPOP: ', result);
            if (!err && result) {
                logger.debug(result.toString());
                callback(null, JSON.parse(result.toString()));
            } else {
                var errorMsg = 'No list exists to get random members from. Propably the game is over.';
                logger.error(errorMsg);
                callback(errorMsg);
            }
        });
    };

    /**
     *
     * calculate the area around this pixel (for example 3x3) where the chosen pixel is 0x0 and take it as gaming-pixel-area
     *
     * @param {array} startPixel [row,col]
     * @param {int} playgroundSize
     *
     */
    this.calculateGamingPixelArea = function(startPixel, playgroundSize) {
        playgroundSize = typeof playgroundSize == "undefined" ? config.plan9.playground.tablesize : playgroundSize;

        var gamingPixelArea = [];
        var overViewSize = config.plan9.overview.size;
        var overviewCols = overViewSize.cols;
        var overviewRows = overViewSize.rows;

        var colOverlappingCoordinateStartIndex = null;
        var colCoordinateStart = startPixel[1];
        var colCoordinateEnd = (colCoordinateStart + playgroundSize - 1);
        if (colCoordinateEnd > overviewCols) {
            logger.debug('CbtCalculator - calculateGamingPixelArea - overlapping of col pixels in gamearea.');
            colOverlappingCoordinateStartIndex = playgroundSize - (colCoordinateEnd - overviewCols);
            logger.debug('CbtCalculator - calculateGamingPixelArea - colOverlappingCoordinateStartIndex:', colOverlappingCoordinateStartIndex);
        }

        var rowOverlappingCoordinateStartIndex = null;
        var rowCoordinateStart = startPixel[0];
        var rowCoordinateEnd = (rowCoordinateStart + playgroundSize - 1);
        if (rowCoordinateEnd > overviewRows) {
            logger.debug('CbtCalculator - calculateGamingPixelArea - overlapping of row pixels in gamearea.');
            rowOverlappingCoordinateStartIndex = playgroundSize - (rowCoordinateEnd - overviewRows);
            logger.debug('CbtCalculator - calculateGamingPixelArea - rowOverlappingCoordinateStartIndex:', rowOverlappingCoordinateStartIndex);
        }

        var currentRowCoordinate = rowCoordinateStart;
        for (var i = 0; i < playgroundSize; i++) {
            if (rowOverlappingCoordinateStartIndex && i == rowOverlappingCoordinateStartIndex) {
                logger.debug('CbtCalculator - calculateGamingPixelArea - row begin count at zero');
                currentRowCoordinate = 0;
            }

            var currentColCoordinate = colCoordinateStart;
            for (var j = 0; j < playgroundSize; j++) {
                if (colOverlappingCoordinateStartIndex && j == colOverlappingCoordinateStartIndex) {
                    logger.debug('CbtCalculator - calculateGamingPixelArea - col begin count at zero');
                    currentColCoordinate = 0;
                }
                gamingPixelArea.push([currentRowCoordinate, currentColCoordinate]);
                currentColCoordinate++;
            }
            currentRowCoordinate++;
        }

        return gamingPixelArea;
    };

    // get the diff of pixels in gaming-pixel-area compared to pixel_lock (global) and pixel_solved and write it to user_lock and global_lock playable-pixel-of-gaming-pixel-area
    this.storeRealGamingPixels = function(gamingPixelArea, userId, gamingPixelCallback) {
        var errorResult = {
            message: '',
            code: 0
        };

        async.waterfall([
            function(callback) {
                var tmpKeyName = (new Date().getTime()).toString() + (new Date().getMilliseconds()).toString();
                var sAddValues = [];

                for (var coordinate in gamingPixelArea) {
                    if (gamingPixelArea.hasOwnProperty(coordinate)) {
                        sAddValues.push(JSON.stringify(gamingPixelArea[coordinate]));
                    }
                }

                logger.debug(sAddValues);
                logger.debug('add all pixel coordinates to a temp list');
                redisClient.SADD(tmpKeyName, sAddValues, function(err, result) {
                    logger.debug('CbtCalculator - getRealGamingPixels - error or SADD: ', err);
                    logger.debug('CbtCalculator - getRealGamingPixels - result of SADD: ', result);
                    if (!err) {
                        callback(null, tmpKeyName);
                    } else {
                        logger.debug(errorResult.message);
                        errorResult.message = 'Cannot write to: ' + tmpKeyName + '. List exists and / or no objects can be added.';
                        callback(errorResult, null);
                    }
                });
            },
            function(tmpKeyname, callback) {
                var userPixelLockKeyName = keyListPixelLockUserPrefix + userId;
                logger.debug('store the diff of tmpList, lockedPixelList (global) and solvedPixeList to userPixelLockList');
                redisClient.SDIFFSTORE(userPixelLockKeyName, tmpKeyname, keyListPixelLock, keyListPixelSolved, function(err, result) {
                    logger.debug('CbtCalculator - getRealGamingPixels - error or SDIFFSTORE: ', err);
                    logger.debug('CbtCalculator - getRealGamingPixels - result of SDIFFSTORE: ', result);
                    // delete the tmpList
                    redisClient.DEL(tmpKeyname);

                    if (!err && 0 < result) {
                        callback(null, userPixelLockKeyName);
                    } else {
                        errorResult.message = 'Seems there is no pixel free to play. So start over.';
                        errorResult.code = 1;
                        callback(errorResult);
                    }
                });
            },
            function(userPixelLockKeyName, callback) {
                // fetch everything from the userPixelLockList
                redisClient.SUNIONSTORE(keyListPixelLock, keyListPixelLock, userPixelLockKeyName, function(err, result) {
                    logger.debug('CbtCalculator - getRealGamingPixels - error on SUNIONSTORE: ', err);
                    logger.debug('CbtCalculator - getRealGamingPixels - result on SUNIONSTORE: ', result);
                    if (!err) {
                        callback(null, userPixelLockKeyName);
                    } else {
                        errorResult.message = 'Cannot do something in SUNIONSTORE.';
                        callback(errorResult);
                    }
                });
            }
        ], function(err, userPixelLockKeyName) {
            if (err) {
                logger.error('CbtCalculator - getRealGamingPixels - error in series' + err.message);
                if (err.code == 1) {
                    gamingPixelCallback(null, null);
                } else {
                    gamingPixelCallback(err, null);
                }
            } else {
                gamingPixelCallback(null, userPixelLockKeyName);
            }
        });
    };

    /**
     * get pixel for user cbt from user_lock
     *
     * @param {array} userPixelLockKeyName
     * @param {function} callback(err, result)
     *
     * @type {*|function(this:CbtCalculator)}
     *
     */
    this.getPixelForUserCbtFromUserLock = function(userPixelLockKeyName, callback) {
        redisClient.SRANDMEMBER(userPixelLockKeyName, function(err, result) {
            logger.debug('CbtCalculator - getPixelForUserCbtFromUserLock - error or SRANDMEMBER: ', err);
            logger.debug('CbtCalculator - getPixelForUserCbtFromUserLock - result of SRANDMEMBER: ', result);
            if (!err && result) {
                logger.debug(result.toString());
                callback(null, JSON.parse(result.toString()));
            } else {
                var errorMsg = 'No list exists to get random members from. Propably the game is over.';
                logger.error(errorMsg);
                callback(errorMsg);
            }
        });
    };

    /**
     * calculate users cbt based on pixel from user_lock
     *
     *
     * @param {array} pixel
     * @param {function} callback(err, result)
     * @param {int} playgroundSize
     *
     * @type {*|function(this:CbtCalculator)}
     *
     */
    this.calculateCbtForPixel = function(pixel, callback, playgroundSize) {
        var playgroundConfig = config.plan9.playground;
        playgroundSize = typeof playgroundSize == "undefined" ? playgroundConfig.tablesize : playgroundSize;
        var playgroundImageSpriteConfig = playgroundConfig.imageSprite;

        var playgroundTableRow = Math.floor((Math.random() * playgroundSize));
        var playgroundTableCol = Math.floor((Math.random() * playgroundSize));

        var playgroundImageEntityWidth = playgroundImageSpriteConfig.size.width;
        var playgroundImageEntityHeight = playgroundImageSpriteConfig.size.height;

        var currentRandomImgCol = (Math.random() * playgroundImageSpriteConfig.numimagecols);
        var currentRandomImgRow = (Math.random() * playgroundImageSpriteConfig.numimagerows);

        logger.debug('currentRandomImgCol' + currentRandomImgCol);
        logger.debug('currentRandomImgRow' + currentRandomImgRow);
        logger.debug('playgroundImageEntityWidth' + playgroundImageEntityWidth);
        logger.debug('playgroundImageEntityHeight' + playgroundImageEntityHeight);

        var imageSpriteIncreaseFactor = parseInt(playgroundConfig.imageSpriteIncreaseFactor);
        var playgroundTableBgImgPosX = (-(Math.floor(currentRandomImgCol * playgroundImageEntityWidth * imageSpriteIncreaseFactor))).toString();
        var playgroundTableBgImgPosY = (-(Math.floor(currentRandomImgRow * playgroundImageEntityHeight * imageSpriteIncreaseFactor))).toString();

        var chance = Math.round(((Math.random() * playgroundConfig.matchcomparisionground)));
        var shouldPlaygroundCaptureMatchComparisionGroundImage = chance == 1;

        logger.debug('CHANCE to get a correct picture combination: ' + chance);
        logger.debug('var shouldPlaygroundCaptureMatchComparisionGroundImage = Math.round(chance) == 1;' + shouldPlaygroundCaptureMatchComparisionGroundImage);

        var comparisongroundConfig = config.plan9.comparisonground;
        var comparisongroundImageEntityWidth = comparisongroundConfig.imageEntity.size.width;
        var comparisongroundImageEntityHeight = comparisongroundConfig.imageEntity.size.height;

        var cbtSolution = true;
        if (false == shouldPlaygroundCaptureMatchComparisionGroundImage) {
            var tmpRandomImgCol = currentRandomImgCol;
            while (tmpRandomImgCol == currentRandomImgCol) {
                tmpRandomImgCol = (Math.random() * playgroundImageSpriteConfig.numimagecols);
            }
            currentRandomImgCol = tmpRandomImgCol;

            var tmpRandomImgRow = currentRandomImgRow;
            while (tmpRandomImgRow == currentRandomImgRow) {
                tmpRandomImgRow = (Math.random() * playgroundImageSpriteConfig.numimagerows);
            }
            currentRandomImgRow = tmpRandomImgRow;
            cbtSolution = false;
        }

        var comparisiongroundBgImgPosX = -(Math.floor(currentRandomImgCol) * comparisongroundImageEntityWidth).toString();
        var comparisiongroundBgImgPosY = -(Math.floor(currentRandomImgRow) * comparisongroundImageEntityHeight).toString();

        var tmpKeyName = (new Date().getTime()).toString() + (new Date().getMilliseconds()).toString();
        // {"cbt":{"solved":true, "playground":{"tablerow":"1", "tablecol":"1", "bg_img_position":"-200px -50px"}, "comparisonground":{"bg_img_position":"0 0"}}}
        var cbt = {
            cbt: {
                solutiontoken: tmpKeyName,
                solved: false,
                playground: {
                    tablerow: playgroundTableRow,
                    tablecol: playgroundTableCol,
                    bg_img_position: playgroundTableBgImgPosX + 'px ' + playgroundTableBgImgPosY + 'px'
                },
                comparisonground: {
                    bg_img_position: comparisiongroundBgImgPosX + 'px ' + comparisiongroundBgImgPosY + 'px'
                }
            }
        };

        var saveSolution = {
            solution: cbtSolution,
            pixel: pixel,
            entity_pixel: [Math.floor(currentRandomImgCol), Math.floor(currentRandomImgRow)],
            playground: {
               tablerow: playgroundTableRow,
               tablecol: playgroundTableCol
            }
        };

        var multi = redisClient.multi();
        multi.set(tmpKeyName, JSON.stringify(saveSolution));
        multi.expire(tmpKeyName, 600);
        multi.exec(function (err, replies) {
            logger.debug('CbtCalculator - calculateCbtForPixel - error on MULTI EXEC: ', err);
            logger.debug('CbtCalculator - calculateCbtForPixel - result on MULTI EXEC: ', replies);
            if (!err) {
                callback(null, cbt);
            } else {
                callback(err);
            }
        });
    };

    /**
     * @param cbt
     * @param solverCallback
     */
    this.cbtHasBeenSolvedCorrectly = function(cbt, solverCallback) {
        var solutionToken = cbt.solutiontoken;
        logger.debug('solution token = ' + solutionToken);

        async.series([
            function(callback) {
                redisClient.EXISTS(solutionToken, function(err, result) {
                    logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - err on EXISTS ', err);
                    logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - result on EXISTS ', result);
                    if (!err && 1 == result) {
                        callback(null, null);
                    } else {
                        if (!err) {
                            err = 'Could not find the solutionToken: ' + solutionToken;
                        }
                        callback(err);
                    }
                })
            },
            function(callback) {
                redisClient.GET(solutionToken, function(err, result) {
                    logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - err on GET ', err);
                    logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - result on GET ', result);
                    if (!err) {
                        var parsedResult = JSON.parse(result);
                        logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - result: ' + cbt.solution == parsedResult.solution);
                        callback(null, [(cbt.solution == parsedResult.solution), parsedResult]);
                    } else {
                        callback(err);
                    }
                })
            }
        ], function(err, results) {
            redisClient.DEL(solutionToken);
            if (err) {
                logger.debug('CbtCalculator - cbtHasBeenSolvedCorrectly - endresult - err: ', err);
                solverCallback(err, false, null);
            } else {
                solverCallback(null, results[1][0], results[1][1]);
            }
        });
    };

    // save solved pixel in pixel solved (remove it from pixel_lock, user_lock and pixel_free and put it to pixel_solved)
    this.setPixelToSolved = function(userId, pixel, callback) {
        var userPixelLockKeyName = keyListPixelLockUserPrefix + userId;
        var serializedPixel = JSON.stringify(pixel);
        var multi = redisClient.multi();

        multi.SREM(keyListPixelFree, serializedPixel);
        multi.SREM(keyListPixelLock, serializedPixel);
        multi.SMOVE(userPixelLockKeyName, keyListPixelSolved, serializedPixel);
        multi.EXEC(function(err, results) {
            logger.debug('CbtCalculator - setPixelToSolved - err on mulit.EXEC ', err);
            logger.debug('CbtCalculator - setPixelToSolved - result on mulit.EXEC ', results);
            if (!err) {
                callback(null, results);
            } else {
                callback(err);
            }
        });
    };

    // if user disconnects, remove all pixels from locks
    this.removePixelsFromLocksForUser = function(userId, callback) {
        var userPixelLockKeyName = keyListPixelLockUserPrefix + userId;
        var multi = redisClient.multi();

        multi.SUNIONSTORE(keyListPixelFree, keyListPixelFree, userPixelLockKeyName);
        multi.SDIFFSTORE(keyListPixelLock, keyListPixelLock, userPixelLockKeyName);
        multi.DEL(userPixelLockKeyName);

        multi.EXEC(function(err, results) {
            logger.debug('CbtCalculator - removePixelsFromLocksForUser - err on mulit.EXEC ', err);
            logger.debug('CbtCalculator - removePixelsFromLocksForUser - result on mulit.EXEC ', results);
            if (!err) {
                callback(null, results);
            } else {
                callback(err);
            }
        });
    };

    this.getCbtForUser = function(userId, cbtUserCallback) {
        async.waterfall([
            function(callback) {
                this.getStartPixel(function(err, result) {
                    if (!err) {
                        logger.debug('startPixel = ', result);
                        var gamingPixelArea = this.calculateGamingPixelArea(result);
                        logger.debug('gamingPixelArea = ', gamingPixelArea);
                        callback(null, gamingPixelArea);
                    }
                }.bind(this));
            }.bind(this),
            function(gamingPixelArea, callback) {
                this.storeRealGamingPixels(gamingPixelArea, userId, function(err, userPixelLockKeyName) {
                    if (!err && null != userPixelLockKeyName) {
                        callback(null, userPixelLockKeyName);
                    } else if (!err && !userPixelLockKeyName) {
                        calculateCbt(userId);
                        callback('starting over!');
                    } else {
                        callback(err);
                    }
                });
            }.bind(this),
            function(userPixelLockKeyName, callback) {
                this.getPixelForUserCbtFromUserLock(userPixelLockKeyName, function(err, pixel) {
                    if (!err) {
                        callback(null, pixel);
                    } else {
                        callback(err);
                    }
                });
            }.bind(this),
            function(pixel, callback) {
                this.calculateCbtForPixel(pixel, function(err, cbt){
                    if (!err) {
                        logger.debug('This is the cbt to send: ', cbt);
                        callback(null, cbt);
                    } else {
                        callback(err);
                    }
                });
            }.bind(this)
        ], function(err, cbt) {
            if(err) {
                logger.error(err);
                cbtUserCallback(err, null);
            } else {
                cbtUserCallback(null, cbt);
            }
        });
    }.bind(this);
}

module.exports = CbtCalculator;