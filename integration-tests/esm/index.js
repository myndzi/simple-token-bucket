import { TokenBucket } from 'simple-token-bucket';

const bucket = new TokenBucket({
  capacity: 10,
  fillQuantity: 1,
  fillTime: 1000, // in milliseconds
  initialCapacity: 0,
});

bucket.take(3);

console.log('ok');
process.exit(0);
