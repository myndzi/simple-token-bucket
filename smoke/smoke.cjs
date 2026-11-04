// Runs against the installed tarball. Keep this ES5, so it can parse on old Node.
var assert = require('assert');
var fs = require('fs');
var path = require('path');

// Every file named by the package's entry points has to be in the tarball.
var root = path.join(__dirname, 'node_modules', 'simple-token-bucket');
var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
(function check(value) {
  if (typeof value === 'string') {
    assert.ok(fs.existsSync(path.join(root, value)), 'missing from tarball: ' + value);
  } else {
    Object.keys(value).forEach(function (key) { check(value[key]); });
  }
})([pkg.main, pkg.types, pkg.exports]);

var TokenBucket = require('simple-token-bucket').TokenBucket;

var bucket = new TokenBucket({ capacity: 10, fillQuantity: 1, fillTime: 1000, initialCapacity: 2 });
assert.strictEqual(bucket.take(2), 0);
assert.ok(bucket.take(1) > 0, 'an empty bucket should report a wait');
assert.throws(function () { bucket.take(11); }, RangeError);

console.log('cjs ok');
