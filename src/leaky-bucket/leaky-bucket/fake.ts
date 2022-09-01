import LeakyBucket from '.';

export default class FakeLeakyBucket implements LeakyBucket {
  fetchSubscriptionIds(): string[] {
    return [];
  }

  fetchThresholdFor(_: { subscriptionId: string }): number {
    return 1;
  }

  fetchCountFor(_: { subscriptionId: string }): number {
    return 1;
  }

  isAboveThreshold(_: { subscriptionId: string }): Boolean {
    return false;
  }

  subscribe(_: { subscriptionId: string; threshold?: number | undefined }): void {}

  increment(_: { subscriptionId: string }): void {}

  decrement(_: { subscriptionId: string }): void {}

  resetCountFor(_: { subscriptionId: string }): void {}
}
