// Runs against the installed tarball.
import assert from 'assert';
import { TokenBucket } from 'simple-token-bucket';

const bucket = new TokenBucket({ capacity: 10, fillQuantity: 1, fillTime: 1000, initialCapacity: 2 });
assert.strictEqual(bucket.take(2), 0);
assert.ok(bucket.take(1) > 0, 'an empty bucket should report a wait');
assert.throws(() => bucket.take(11), RangeError);

console.log('esm ok');
