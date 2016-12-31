'use strict';

function validateAndCoerce(_value, name, allowZero) {
    var value = parseInt(_value, 10);
    if (!isFinite(_value) || isNaN(value) || value !== _value) {
        throw new TypeError(name + ' must be a positive finite integer (was `'+_value+'`)');
    }
    if ((!allowZero && value <= 0) || value < 0) {
        throw new RangeError(name + ' must be a positive finite integer (was `'+_value+'`)');
    }
    return value;
}

function now() {
    return (new Date()).getTime();
}

function TokenBucket(opts) {
    if (!opts) {
        throw new TypeError('TokenBucket constructor requires {capacity, fillQuantity, fillTime}');
    }

    this.capacity = validateAndCoerce(opts.capacity, 'opts.capacity', false);
    this.fillQuantity = validateAndCoerce(opts.fillQuantity, 'opts.fillQuantity', false),
    this.fillTime = validateAndCoerce(opts.fillTime, 'opts.fillTime', false);

    if (opts.hasOwnProperty('initialCapacity')) {
        this.left = validateAndCoerce(opts.initialCapacity, 'opts.initialCapacity', true);
        if (this.left > this.capacity) {
            throw new RangeError(
                'Initial capacity cannot be greater than bucket capacity '+
                '(initialCapacity was `'+opts.initialCapacity+'`, '+
                'capacity was `'+this.capacity+'`)'
            );
        }
    } else {
        this.left = this.capacity;
    }

    this.last = now();
}

// fill the bucket and update last fill time
TokenBucket.prototype._fill = function () {
    var _now = now();

    // fractional amount to add to the bucket
    var fillTokens = Math.floor(
        (_now - this.last)                   // amount of time that has passed
        * this.fillQuantity / this.fillTime // refill rate
    );

    // amount of time it 'took' to add those tokens
    var timeConsumed = Math.floor(
        fillTokens                           // integer tokens added
        * this.fillTime / this.fillQuantity // time per token added
    );

    this.left += fillTokens;
    this.last += timeConsumed;

    if (this.left > this.capacity) {
        this.left = this.capacity;
        this.last = _now;
    }
};

// get time to wait until we can take X tokens
// private method assumes correct input
TokenBucket.prototype._getWaitTime = function (tokens) {
    // technically, time can pass while synchronous code is running;
    // also it's possible to have a bucket that fills very fast
    // as a result, this expression could be < 0 and we must clip
    // it to some sane minimum
    return Math.max(0,
        Math.ceil(
            (tokens - this.left)                 // tokens needed
            * this.fillTime / this.fillQuantity // time per token
            - (now() - this.last)                // time since last token add
        )
    );
};

// attempt to remove tokens from the bucket
// returns minimum amount of time to wait until there are enough tokens;
// 0 represents success
TokenBucket.prototype.take = function (_tokens) {
    var tokens = validateAndCoerce(_tokens, 'TokenBucket.take: argument', false);
    if (tokens > this.capacity) {
        throw new RangeError(
            'Cannot remove more tokens than the bucket capacity '+
            '(tried to take `'+tokens+'`, capacity is `'+this.capacity+'`)'
        );
    }

    this._fill();

    var waitTime = this._getWaitTime(tokens);

    // waitTime should never be less than zero, but it doesn't hurt us to
    // include that case here
    if (tokens <= this.left) {
        // success; consume tokens
        this.left -= tokens;
    }

    return waitTime;
};

module.exports = TokenBucket;