class SubscriptionIdNotRegisteredError extends Error {
  constructor() {
    super('Provided subscriptionId is not registered. Please register it first.');
  }
}

export const DEFAULT_THRESHOLD = 100;

export default interface LeakyBucket {
  subscribe({ subscriptionId, threshold }: { subscriptionId: string; threshold?: number }): void;
  fetchSubscriptionIds(): Array<string>;
  fetchThresholdFor({ subscriptionId }: { subscriptionId: string }): number;
  fetchCountFor({ subscriptionId }: { subscriptionId: string }): number;
  increment({ subscriptionId }: { subscriptionId: string }): void;
  decrement({ subscriptionId }: { subscriptionId: string }): void;
  resetCountFor({ subscriptionId }: { subscriptionId: string }): void;
  isAboveThreshold({ subscriptionId }: { subscriptionId: string }): Boolean;
}

export class LeakyBucketImpl implements LeakyBucket {
  COUNTERS: Object;

  constructor() {
    this.COUNTERS = {};

    this.isSubscriptionIdRegistered = this.isSubscriptionIdRegistered.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.fetchSubscriptionIds = this.fetchSubscriptionIds.bind(this);
    this.fetchThresholdFor = this.fetchThresholdFor.bind(this);
    this.fetchCountFor = this.fetchCountFor.bind(this);
    this.increment = this.increment.bind(this);
    this.decrement = this.decrement.bind(this);
    this.resetCountFor = this.resetCountFor.bind(this);
    this.isAboveThreshold = this.isAboveThreshold.bind(this);
  }

  private isSubscriptionIdRegistered(subscriptionId: string): Boolean {
    return Object.keys(this.COUNTERS).includes(subscriptionId);
  }

  subscribe({
    subscriptionId,
    threshold = DEFAULT_THRESHOLD,
  }: {
    subscriptionId: string;
    threshold?: number;
  }): void {
    if (subscriptionId === '') throw new Error('Invalid subscriptionId. Expected a string.');
    this.COUNTERS[subscriptionId] = { current: 0, threshold: threshold };
  }

  fetchSubscriptionIds(): string[] {
    return Object.keys(this.COUNTERS);
  }

  fetchThresholdFor({ subscriptionId }: { subscriptionId: string }): number {
    return this.COUNTERS[subscriptionId].threshold;
  }

  fetchCountFor({ subscriptionId }: { subscriptionId: string }): number {
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
