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
  }

  handleMessage(msg: LeakyBucketMessage): void {
    const { subscriptionId } = msg.payload;
    switch (msg.type) {
      case LeakyBucketMessageTypes.REGISTER:
        this._bucket.subscribe({ subscriptionId, threshold: msg.payload.threshold });
        break;
      case LeakyBucketMessageTypes.NEW_FAILURE:
        this._bucket.increment({ subscriptionId });
        if (this._bucket.isAboveThreshold({ subscriptionId })) {
          this._processRef.send?.({
            type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION,
            payload: { subscriptionId },
          });
        }
        break;
      case LeakyBucketMessageTypes.RESET:
        this._bucket.resetCountFor({ subscriptionId });
        break;
      default:
        break;
    }
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
}
