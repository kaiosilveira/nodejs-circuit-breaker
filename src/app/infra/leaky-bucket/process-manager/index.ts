import LeakyBucket from '../leaky-bucket';
import { LeakyBucketMessageTypes } from '../messages';
import { LeakyBucketMessage } from '../messages';

export default interface LeakyBucketProcessManager {
  handleMessage(msg: LeakyBucketMessage): void;
  handleTick(): void;
  getTickIntervalInMs(): number;
}

export type LeakyBucketProcessManagerProps = {
  bucket: LeakyBucket;
  tickIntervalMs: number;
  processRef: NodeJS.Process;
};

export class LeakyBucketProcessManagerImpl implements LeakyBucketProcessManager {
  _tickIntervalMs: number;
  _bucket: LeakyBucket;
  _processRef: NodeJS.Process;

  constructor({ bucket, tickIntervalMs, processRef }: LeakyBucketProcessManagerProps) {
    this._bucket = bucket;
    this._tickIntervalMs = tickIntervalMs;
    this._processRef = processRef;

    this.handleMessage = this.handleMessage.bind(this);
    this.handleTick = this.handleTick.bind(this);
    this.getTickIntervalInMs = this.getTickIntervalInMs.bind(this);

    this.handleRegisterMessage = this.handleRegisterMessage.bind(this);
    this.handleNewFailureMessage = this.handleNewFailureMessage.bind(this);
    this.handleResetMessage = this.handleResetMessage.bind(this);
  }

  handleTick(): void {
    this._bucket.fetchSubscriptionIds().forEach((subscriptionId: string) => {
      const currentCount = this._bucket.fetchCountFor({ subscriptionId });
      const threshold = this._bucket.fetchThresholdFor({ subscriptionId });
      if (currentCount - threshold === 1) {
        this._processRef.send?.({
          type: LeakyBucketMessageTypes.THRESHOLD_RESTORED,
          subscriptionId,
        });
      }
      this._bucket.decrement({ subscriptionId });
    });
  }

  getTickIntervalInMs(): number {
    return this._tickIntervalMs;
  }

  handleMessage(msg: LeakyBucketMessage): void {
    switch (msg.type) {
      case LeakyBucketMessageTypes.REGISTER:
        this.handleRegisterMessage(msg);
        break;
      case LeakyBucketMessageTypes.NEW_FAILURE:
        this.handleNewFailureMessage(msg);
        break;
      case LeakyBucketMessageTypes.RESET:
        this.handleResetMessage(msg);
        break;
      default:
        break;
    }
  }

  private handleRegisterMessage(msg: LeakyBucketMessage): void {
    const { subscriptionId, threshold } = msg.payload;
    this._bucket.subscribe({ subscriptionId, threshold });
  }

  private handleNewFailureMessage(msg: LeakyBucketMessage): void {
    const { subscriptionId } = msg.payload;
    this._bucket.increment({ subscriptionId });
    if (this._bucket.isAboveThreshold({ subscriptionId })) {
      this._processRef.send?.({
        type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION,
        payload: { subscriptionId },
      });
    }
  }

  private handleResetMessage(msg: LeakyBucketMessage): void {
    const { subscriptionId } = msg.payload;
    this._bucket.resetCountFor({ subscriptionId });
  }
}
