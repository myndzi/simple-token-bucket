# simple-token-bucket

Typescript token bucket implementation with no dependencies.

```
$ npm install --save simple-token-bucket
```

```ts
import { TokenBucket } from 'simple-token-bucket';

const bucket = new TokenBucket({
    capacity: 10,
    fillQuantity: 1,
    fillTime: 1000, // in milliseconds
    initialCapacity: 0
});

const timeToWait = bucket.take(3);
```

## Options
* **capacity**: the capacity of the token bucket, aka burstiness
* **fillQuantity**: how many tokens to add when filling
* **fillTime**: how much time it takes to add fillQuantity tokens
* **initialCapacity**: the bucket initializes to max capacity by default, but you can optionally change it here

`fillQuantity` and `fillTime` combined create a rate which is used to calculate both how many tokens to add at any given moment and how much time remains before a request can be fulfilled. I chose this approach since most of the time it's desirable to specify a rate limit in "X's per Y".

## Methods

### #take(N)
Attempts to take N tokens from the bucket. Throws a `RangeError` if N exceeds the bucket's capacity. Returns 0 if successful, else returns the minimum number of milliseconds you must wait before the call will be successful.

Note: This isn't a guarantee that the call *will* be successful, since other things might take from the bucket in the meantime!

## What
A token bucket is a rate-limiting construct that requires no timers and uses a fixed amount of memory. Conceptually, every `fillTime` ms, `fillQuantity` "tokens" are added to an imaginary "bucket". When you want to do a thing, you attempt to remove one (or more) tokens from the bucket; if the bucket contains enough tokens, you may proceed, else you must fail.

Token buckets can be used to reject a request from a source that is behaving too aggressively or as a building block for holding your own requests to some fixed rate, though in the latter case you may want to investigate the "leaky bucket" algorithm instead.

Note: In this implementation, tokens are not locked to being added in groups of `fillQuantity`; instead, before each call to `take`, as many tokens are added to the bucket as possible given the time elapsed since the last attempt and the rate calculated by the two fill parameters.

## Why
The token bucket implementations I found on NPM are either wrapped up in magic for applying rate limiting to things or not very robust. I wanted something to just "run the numbers" and give me the results, similar to what I did with [simple-backoff](https://www.npmjs.com/package/simple-backoff).

