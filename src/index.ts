const validateAndCoerce = (value: any, name: string, allowZero: boolean): number => {
  const parsed = parseInt(value, 10);
  if (!isFinite(parsed) || isNaN(parsed) || value !== parsed) {
    throw new TypeError(`${name} must be a positive finite integer (was \`${value}\`)`);
  }
  if ((!allowZero && value <= 0) || value < 0) {
    throw new RangeError(`${name} must be a positive finite integer (was \`${value}\``);
  }
  return parsed;
};

export type BucketOptions = {
  capacity: number;
  fillQuantity: number;
  fillTime: number;
  initialCapacity?: number;
};

export class TokenBucket {
  private capacity: number;
  private fillQuantity: number;
  private fillTime: number;
  private left: number;
  private last: number;

  constructor(opts: BucketOptions) {
    if (!opts) throw new TypeError("TokenBucket constructor requires {capacity, fillQuantity, fillTime}");

    this.capacity = validateAndCoerce(opts.capacity, "opts.capacity", false);
    this.fillQuantity = validateAndCoerce(opts.fillQuantity, "opts.fillQuantity", false);
    this.fillTime = validateAndCoerce(opts.fillTime, "opts.fillTime", false);

    if (Object.prototype.hasOwnProperty.call(opts, "initialCapacity")) {
      this.left = validateAndCoerce(opts.initialCapacity, "opts.initialCapacity", true);
      if (this.left > this.capacity) {
        throw new RangeError(
          `Initial capacity cannot be greater than bucket capacity (initialCapacity was \`${this.left}\`, capacity was \`${this.capacity}\`)`
        );
      }
    } else {
      this.left = this.capacity;
    }

    this.last = Date.now();
  }

  // fill the bucket and update last fill time
  private _fill() {
    const now = Date.now();

    // fractional amount to add to the bucket
    // prettier-ignore
    const fillTokens = Math.floor(
      (now - this.last)                    // amount of time that has passed
      * this.fillQuantity / this.fillTime  // refill rate
    );

    // amount of time it 'took' to add those tokens
    // prettier-ignore
    const timeConsumed = Math.floor(
      fillTokens                           // integer tokens added
      * this.fillTime / this.fillQuantity  // time per token added
    );

    this.left += fillTokens;
    this.last += timeConsumed;

    if (this.left > this.capacity) {
      this.left = this.capacity;
      this.last = now;
    }
  }

  // get time to wait until we can take X tokens
  // private method assumes correct input
  private _getWaitTime(tokens: number) {
    // technically, time can pass while synchronous code is running;
    // also it's possible to have a bucket that fills very fast
    // as a result, this expression could be < 0 and we must clip
    // it to some sane minimum

    // prettier-ignore
    return Math.max(0,
        Math.ceil(
          (tokens - this.left)                 // tokens needed
          * this.fillTime / this.fillQuantity  // time per token
          - (Date.now() - this.last)           // time since last token add
        )
    );
  }

  // attempt to remove tokens from the bucket
  // returns minimum amount of time to wait until there are enough tokens;
  // 0 represents success
  take(tokens: number) {
    const parsed = validateAndCoerce(tokens, "TokenBucket.take: argument", false);
    if (parsed > this.capacity) {
      throw new RangeError(
        `Cannot remove more tokens than the bucket capacity (tried to take \`${parsed}\`, capacity is \`${this.capacity}\`)`
      );
    }

    this._fill();

    const waitTime = this._getWaitTime(parsed);

    // waitTime should never be less than zero, but it doesn't hurt us to
    // include that case here
    if (tokens <= this.left) {
      // success; consume tokens
      this.left -= tokens;
    }

    return waitTime;
  }
}
