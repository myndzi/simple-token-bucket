import { BucketOptions, TokenBucket } from './index';

const esc = (val: any) => String(val).replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

describe('TokenBucket', () => {
  const TYPE_ERRORS: any[] = [-Infinity, -1.2, 1.2, Infinity, NaN, null, new Date(), true, false, 'foo', '', void 0, [], {}, () => {}],
    RANGE_ERRORS = [-1, 0];
  type NumberKeys = keyof { [K in keyof BucketOptions as number extends BucketOptions[K] ? K : never]: 1 };

  describe('constructor', () => {
    it('should throw with no options', () => {
      const create = () => new (TokenBucket as any)();
      expect(create).toThrow(TypeError);
      expect(create).toThrow(/constructor requires/);
    });

    const allowZero: Partial<Record<NumberKeys, boolean>> = { initialCapacity: true };

    const requiredKeys: NumberKeys[] = ['capacity', 'fillQuantity', 'fillTime'];
    describe('missing opts', () => {
      it.each(requiredKeys)('should throw a TypeError when `%s` is absent', key => {
        const opts: BucketOptions = {
          capacity: 10,
          fillQuantity: 1,
          fillTime: 1000,
        };
        delete opts[key];
        const create = () => new TokenBucket(opts);
        expect(create).toThrow(TypeError);
        expect(create).toThrow(new RegExp(`${key} must be`));
      });
    });

    const allKeys: NumberKeys[] = ['capacity', 'fillQuantity', 'fillTime', 'initialCapacity'];
    const typeTests: [NumberKeys, any][] = allKeys.flatMap(key =>
      TYPE_ERRORS.map((invalidValue): [NumberKeys, any] => [key, invalidValue])
    );
    describe('invalid opt values', () => {
      it.each(typeTests)('should throw a TypeError when `%s` is `%p`', (key, invalidValue) => {
        const opts: BucketOptions = {
          capacity: 10,
          fillQuantity: 1,
          fillTime: 1000,
        };
        opts[key] = invalidValue;
        const create = () => new TokenBucket(opts);
        expect(create).toThrow(TypeError);
        expect(create).toThrow(new RegExp(key + ' must be.*was `' + esc(invalidValue) + '`'));
      });
    });

    const rangeTests: [string, NumberKeys, number][] = allKeys.flatMap(key =>
      RANGE_ERRORS.map((value): [string, NumberKeys, number] => [allowZero[key] ? ' ' : ' NOT', key, value])
    );
    describe('opts value ranges', () => {
      it.each(rangeTests)('should%s allow `%s` to be `%p`', (_, key, val) => {
        const opts: BucketOptions = {
          capacity: 10,
          fillQuantity: 1,
          fillTime: 1000,
        };
        opts[key] = val;
        const create = () => new TokenBucket(opts);

        if (val === 0 && allowZero[key]) {
          expect(create).not.toThrow(RangeError);
        } else {
          expect(create).toThrow(RangeError);
          expect(create).toThrow(new RegExp(key + ' must be.*was `' + esc(String(val)) + '`'));
        }
      });
      it('should throw a RangeError when `initialCapacity` > `capacity`', () => {
        const opts: BucketOptions = {
          capacity: 11,
          fillQuantity: 1,
          fillTime: 1000,
          initialCapacity: 13,
        };
        const create = () => new TokenBucket(opts);
        expect(create).toThrow(RangeError);
        expect(create).toThrow(/Initial capacity cannot be greater.*initialCapacity was `13`.*capacity was `11`/);
      });
    });
  });

  describe('#take', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    describe('errors', () => {
      const init = () => ({
        bucket: new TokenBucket({
          capacity: 10,
          fillQuantity: 1,
          fillTime: 1000,
          initialCapacity: 1,
        }),
      });
      it.each(TYPE_ERRORS)('should throw a TypeError when taking` is `%p`', val => {
        const { bucket } = init();
        const take = () => bucket.take(val);
        expect(take).toThrow(TypeError);
        expect(take).toThrow(new RegExp('TokenBucket.take: argument must be.*was `' + esc(val) + '`'));
      });

      it.each(RANGE_ERRORS)('should throw a RangeError when taking `%p`', val => {
        const { bucket } = init();
        const take = () => bucket.take(val);
        expect(take).toThrow(RangeError);
        expect(take).toThrow(new RegExp('TokenBucket.take: argument must be.*was `' + esc(val) + '`'));
      });
    });
    describe('clock', () => {
      it('should accept a custom clock', () => {
        let now = 10;
        const clock = () => now;

        const bucket = new TokenBucket({
          capacity: 1,
          fillQuantity: 1,
          fillTime: 1,
          clock: clock,
        });

        expect(bucket.take(1)).toEqual(0);
        expect(bucket.take(1)).toEqual(1);
        jest.advanceTimersByTime(1);
        expect(bucket.take(1)).toEqual(1);
        now++;
        expect(bucket.take(1)).toEqual(0);
      });

      it('should use performance api', () => {
        const spy = jest.spyOn(performance, 'now');

        const bucket = new TokenBucket({
          capacity: 1,
          fillQuantity: 1,
          fillTime: 1,
        });

        expect(bucket.take(1)).toEqual(0);
        expect(bucket.take(1)).toEqual(1);
        jest.advanceTimersByTime(1);
        expect(bucket.take(1)).toEqual(0);
        expect(spy.mock.calls.length).toBeGreaterThan(0);
        spy.mockRestore();
      });
    });

    describe('behavior', () => {
      const tests: [number, number][] = [
        [1, 1000],
        [30, 60000],
        [50, 1],
        [Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100000) + 1],
      ];
      it('respects default initial capacity', () => {
        const bucket = new TokenBucket({ capacity: 2, fillQuantity: 1, fillTime: 1 });
        expect(bucket.take(1)).toEqual(0);
        expect(bucket.take(1)).toEqual(0);
        expect(bucket.take(1)).toEqual(1);
        jest.advanceTimersByTime(1);
        expect(bucket.take(1)).toEqual(0);
      });
      describe.each(tests)('%d tokens per %d ms', (fillQuantity, fillTime) => {
        const capacity = 10;
        const init = () => ({
          bucket: new TokenBucket({
            capacity,
            fillQuantity,
            fillTime,
            initialCapacity: 1,
          }),
          nextFillTime: Math.ceil(fillTime / fillQuantity),
        });

        it('should respect initialCapacity', () => {
          const { bucket, nextFillTime } = init();
          expect(bucket.take(1)).toEqual(0);
          expect(bucket.take(1)).toEqual(nextFillTime);
        });

        it('should fill over time', () => {
          const { bucket, nextFillTime } = init();
          expect(bucket.take(2)).toEqual(nextFillTime);
          jest.advanceTimersByTime(nextFillTime);
          expect(bucket.take(2)).toEqual(0);
        });

        it('should return accurate wait times', () => {
          const { bucket, nextFillTime } = init();
          expect(bucket.take(1)).toEqual(0);
          const half = nextFillTime / 2;
          jest.advanceTimersByTime(half);
          const min = Math.floor(half);
          const max = Math.ceil(half);
          const wait = bucket.take(1);
          expect(wait).toBeGreaterThanOrEqual(min);
          expect(wait).toBeLessThanOrEqual(max);
        });

        it('should not change when failing', () => {
          const { bucket, nextFillTime } = init();
          expect(bucket.take(2)).toEqual(nextFillTime);
          expect(bucket.take(2)).toEqual(nextFillTime);
          expect(bucket.take(1)).toEqual(0);
        });

        it('should not go over `capacity`', () => {
          const { bucket, nextFillTime } = init();
          jest.advanceTimersByTime(capacity * nextFillTime + 10000);
          expect(bucket.take(capacity)).toEqual(0);
          expect(bucket.take(1)).toEqual(nextFillTime);
        });

        it('should throw a RangeError when attempting to take more than `capacity` tokens', () => {
          const { bucket } = init();
          const takeNum = capacity + 1;
          const take = () => bucket.take(takeNum);
          expect(take).toThrow(RangeError);
          expect(take).toThrow(new RegExp('Cannot remove more.*tried to take `' + takeNum + '`, capacity is `' + capacity + '`'));
        });
      });
    });
  });
});
