import { LeakyBucketImpl } from './leaky-bucket';

describe('LeakyBucket', () => {
  describe('subscribe', () => {
    it('should throw an error if subscriptionId is invalid', () => {
      const bucket = new LeakyBucketImpl();
      expect(() => {
        bucket.subscribe({ subscriptionId: '' });
      }).toThrow('Invalid subscriptionId. Expected a string.');
    });

    it('should allow new subscriptions', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      bucket.subscribe({ subscriptionId });

      expect(bucket.subscriptions).toHaveLength(1);
      expect(bucket.subscriptions[0]).toEqual(subscriptionId);
    });

    it('should set the default threshold as 100', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      bucket.subscribe({ subscriptionId });

      expect(bucket.fetchThresholdFor({ subscriptionId })).toEqual(100);
    });

    it('should allow to specify a different threshold', () => {
      const subscriptionId = 'abcd';
      const threshold = 500;
      const bucket = new LeakyBucketImpl();

      bucket.subscribe({ subscriptionId, threshold });

      expect(bucket.fetchThresholdFor({ subscriptionId })).toEqual(threshold);
    });
  });

  describe('fetchFailureCountFor', () => {
    it('should throw an error if subscriptionId is not registered', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      expect(() => bucket.fetchCountFor({ subscriptionId })).toThrow(
        'Provided subscriptionId is not registered. Please register it first.'
      );
    });

    it('should return the failure count for a subscription', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });

      const failureCount = bucket.fetchCountFor({ subscriptionId });

      expect(failureCount).toEqual(0);
    });
  });

  describe('registerFailure', () => {
    it('should throw an error if subscriptionId is not registered', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      expect(() => {
        bucket.increment({ subscriptionId });
      }).toThrow('Provided subscriptionId is not registered. Please register it first.');
    });

    it('should register a new failure for a subscription', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });

      bucket.increment({ subscriptionId });

      expect(bucket.fetchCountFor({ subscriptionId })).toEqual(1);
    });
  });

  describe('resetCountsFor', () => {
    it('should throw an error if subscriptionId is not registered', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      expect(() => bucket.resetCountFor({ subscriptionId })).toThrow(
        'Provided subscriptionId is not registered. Please register it first.'
      );
    });

    it('should reset the counts for a given subscription id', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });

      bucket.resetCountFor({ subscriptionId });

      expect(bucket.fetchCountFor({ subscriptionId })).toEqual(0);
    });
  });

  describe('decrement', () => {
    it('should throw an error if subscriptionId is not registered', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      expect(() => bucket.decrement({ subscriptionId })).toThrow(
        'Provided subscriptionId is not registered. Please register it first.'
      );
    });

    it('should decrement the counter for a subscriptionId', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });
      bucket.increment({ subscriptionId });
      bucket.increment({ subscriptionId });

      bucket.decrement({ subscriptionId });
      const count = bucket.fetchCountFor({ subscriptionId });

      expect(count).toEqual(1);
    });

    it('should floor the count to zero', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });

      bucket.decrement({ subscriptionId });
      bucket.decrement({ subscriptionId });

      const count = bucket.fetchCountFor({ subscriptionId });

      expect(count).toEqual(0);
    });
  });

  describe('isAboveThreshold', () => {
    it('should throw an error if subscriptionId is not registered', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();

      expect(() => bucket.isAboveThreshold({ subscriptionId })).toThrow(
        'Provided subscriptionId is not registered. Please register it first.'
      );
    });

    it('should return false if subscription is not above the threshold', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId });

      const isAbove = bucket.isAboveThreshold({ subscriptionId });

      expect(isAbove).toEqual(false);
    });

    it('should return true if subscription is above the threshold', () => {
      const subscriptionId = 'abcd';
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId, threshold: 1 });
      bucket.increment({ subscriptionId });
      bucket.increment({ subscriptionId });

      const isAbove = bucket.isAboveThreshold({ subscriptionId });

      expect(isAbove).toEqual(true);
    });
  });

  describe('fetchSubscriptionIds', () => {
    it('should return all subscription ids', () => {
      const bucket = new LeakyBucketImpl();
      bucket.subscribe({ subscriptionId: '123' });
      bucket.subscribe({ subscriptionId: '456' });

      const subscriptionIds = bucket.fetchSubscriptionIds();

      expect(subscriptionIds).toEqual(['123', '456']);
    });
  });
});
