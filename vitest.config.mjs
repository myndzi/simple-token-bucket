import path from 'path';
import { defineConfig } from 'vitest/config';

// TEST_TARGET points the tests at a built entry point instead of src.
const target = process.env.TEST_TARGET;

const toFake = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'Date'];
// Older vitest doesn't fake this by default, and old Node doesn't have it to fake.
if (typeof performance !== 'undefined') {
  toFake.push('performance');
}

export default defineConfig({
  resolve: {
    alias: target ? [{ find: /^\.\/index$/, replacement: path.resolve(target) }] : [],
  },
  test: {
    include: ['src/**/*.test.ts'],
    fakeTimers: { toFake },
  },
});
