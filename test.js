'use strict';

var TokenBucket = require('./index');

var sinon = require('sinon'),
    should = require('should');

describe('TokenBucket', function () {
    var TYPE_ERRORS = [ -Infinity, -1.2, 1.2, Infinity, NaN, null, new Date(),
        true, false, 'foo', '', void 0, [ ], { }, function () { }
    ], RANGE_ERRORS = [-1, 0];

    describe('constructor', function () {
        // Verify correct/friendly errors
        it('should throw with no options', function () {
            (function () {
                new TokenBucket();
            }).should.throw(TypeError, /constructor requires/);
        });

        var optionalOpts = {initialCapacity: true};
        [ 'capacity', 'fillQuantity', 'fillTime', 'initialCapacity' ].forEach(function (optName) {
            if (!optionalOpts[optName]) {
                it('should throw a TypeError when `'+optName+'` is absent', function () {
                    var opts = {
                        capacity: 10,
                        fillQuantity: 1,
                        fillTime: 1000
                    };
                    delete opts[optName];
                    (function () {
                        new TokenBucket(opts);
                    }).should.throw(TypeError, new RegExp(optName+' must be'));
                });
            }

            TYPE_ERRORS.forEach(function (val) {
                it('should throw a TypeError when `'+optName+'` is `'+val+'`', function () {
                    var opts = {
                        capacity: 10,
                        fillQuantity: 1,
                        fillTime: 1000
                    };
                    opts[optName] = val;
                    (function () {
                        new TokenBucket(opts);
                    }).should.throw(TypeError, new RegExp(optName+' must be.*was `'+val+'`'));
                });
            });

            RANGE_ERRORS.forEach(function (val) {
                it('should throw a RangeError when `'+optName+'` is `'+val+'`', function () {
                    var opts = {
                        capacity: 10,
                        fillQuantity: 1,
                        fillTime: 1000
                    };
                    opts[optName] = val;
                    (function () {
                        new TokenBucket(opts);
                    }).should.throw(RangeError, new RegExp(optName+' must be.*was `'+val+'`'));
                });
            });
        });

        it('should throw a RangeError when `initialCapacity` > `capacity`', function () {
            var opts = {
                capacity: 11,
                fillQuantity: 1,
                fillTime: 1000,
                initialCapacity: 13
            };
            (function () {
                new TokenBucket(opts);
            }).should.throw(RangeError, /Initial capacity cannot be greater.*initialCapacity was `13`.*capacity was `11`/);
        });
    });

    describe.only('#take', function () {
        var clock;
        before(function () { clock = sinon.useFakeTimers(); });
        after(function () { clock.restore(); });

        describe('errors', function () {
            var bucket = new TokenBucket({
                capacity: 10,
                fillQuantity: 1,
                fillTime: 1000,
                initialCapacity: 1
            });

            TYPE_ERRORS.forEach(function (val) {
                it('should throw a TypeError when taking` is `'+val+'`', function () {
                    (function () {
                        bucket.take(val);
                    }).should.throw(TypeError, new RegExp('TokenBucket.take: argument must be.*was `'+val+'`'));
                });
            });

            RANGE_ERRORS.forEach(function (val) {
                it('should throw a RangeError when taking `'+val+'`', function () {
                    (function () {
                        bucket.take(val);
                    }).should.throw(RangeError, new RegExp('TokenBucket.take: argument must be.*was `'+val+'`'));
                });
            });
        });

        [[1, 1000], [30, 60000], [50, 1],
         [Math.floor(Math.random() * 100)+1, Math.floor(Math.random() * 100000)+1]
        ].forEach(function (rate) {
            describe(rate[0] + ' tokens per ' + rate[1] + 'ms', function () {
                var bucket, nextFillTime;
                beforeEach(function () {
                    bucket = new TokenBucket({
                        capacity: 10,
                        fillQuantity: rate[0],
                        fillTime: rate[1],
                        initialCapacity: 1
                    });
                    nextFillTime = Math.ceil(bucket.fillTime / bucket.fillQuantity);
                });

                it('should respect initialCapacity', function () {
                    bucket.take(1).should.equal(0);
                    bucket.take(1).should.equal(nextFillTime);
                });

                it('should fill over time', function () {
                    bucket.take(2).should.equal(nextFillTime);
                    clock.tick(nextFillTime);
                    bucket.take(2).should.equal(0);
                });

                it('should return accurate wait times', function () {
                    bucket.take(1).should.equal(0);
                    clock.tick(nextFillTime / 2);
                    bucket.take(1).should.be.within(Math.floor(nextFillTime / 2), Math.ceil(nextFillTime / 2));
                });

                it('should not change when failing', function () {
                    bucket.take(2).should.equal(nextFillTime);
                    bucket.take(2).should.equal(nextFillTime);
                    bucket.take(1).should.equal(0);
                });

                it('should not go over `capacity`', function () {
                    clock.tick(bucket.capacity*nextFillTime+10000);
                    bucket.take(bucket.capacity).should.equal(0);
                    bucket.take(1).should.equal(nextFillTime);
                });

                it('should throw a RangeError when attempting to take more than `capacity` tokens', function () {
                    var takeNum = bucket.capacity + 1;
                    (function () {
                        bucket.take(takeNum);
                    }).should.throw(RangeError, new RegExp('Cannot remove more.*tried to take `'+takeNum+'`, capacity is `'+bucket.capacity+'`'));
                });
            });
        });
    });
});