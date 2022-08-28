class SubscriptionIdNotRegisteredError extends Error {
  constructor() {
    super('Provided subscriptionId is not registered. Please register it first.');
  }
}

export const DEFAULT_THRESHOLD = 100;
class LeakyBucket {
  COUNTERS = {};

  get subscriptions() {
    return Object.keys(this.COUNTERS);
  }

  private isSubscriptionIdRegistered(subscriptionId: string): Boolean {
    return Object.keys(this.COUNTERS).includes(subscriptionId);
  }

  subscribe({
    subscriptionId,
    threshold = DEFAULT_THRESHOLD,
  }: {
    subscriptionId: string;
    threshold?: Number;
  }): void {
    if (subscriptionId === '') throw new Error('Invalid subscriptionId. Expected a string.');
    this.COUNTERS[subscriptionId] = { current: 0, threshold: threshold };
  }

  fetchThresholdFor({ subscriptionId }: { subscriptionId: string }): Number {
    return this.COUNTERS[subscriptionId].threshold;
  }

  fetchCountFor({ subscriptionId }: { subscriptionId: string }): Number {
    if (!this.isSubscriptionIdRegistered(subscriptionId))
      throw new SubscriptionIdNotRegisteredError();

    return this.COUNTERS[subscriptionId].current;
  }

  increment({ subscriptionId }: { subscriptionId: string }): void {
    if (!this.isSubscriptionIdRegistered(subscriptionId))
      throw new SubscriptionIdNotRegisteredError();

    this.COUNTERS[subscriptionId].current += 1;
  }

  decrement({ subscriptionId }: { subscriptionId: string }): void {
    if (!this.isSubscriptionIdRegistered(subscriptionId))
      throw new SubscriptionIdNotRegisteredError();

    this.COUNTERS[subscriptionId].current = Math.max(0, this.COUNTERS[subscriptionId].current - 1);
  }

  resetCountFor({ subscriptionId }: { subscriptionId: string }): void {
    if (!this.isSubscriptionIdRegistered(subscriptionId))
      throw new SubscriptionIdNotRegisteredError();

    this.COUNTERS[subscriptionId].current = 0;
  }

  isAboveThreshold({ subscriptionId }: { subscriptionId: string }): Boolean {
    if (!this.isSubscriptionIdRegistered(subscriptionId))
      throw new SubscriptionIdNotRegisteredError();

    return this.COUNTERS[subscriptionId].current > this.COUNTERS[subscriptionId].threshold;
  }
}

export default LeakyBucket;
