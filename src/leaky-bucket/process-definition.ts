import { LeakyBucketImpl } from './leaky-bucket';
import { LeakyBucketMessage, LeakyBucketMessageTypes } from './messages';

const bucket = new LeakyBucketImpl();

process.on('message', (msg: LeakyBucketMessage) => {
  const { subscriptionId } = msg.payload;
  switch (msg.type) {
    case LeakyBucketMessageTypes.REGISTER:
      bucket.subscribe({ subscriptionId, threshold: msg.payload.threshold });
      break;
    case LeakyBucketMessageTypes.NEW_FAILURE:
      bucket.increment({ subscriptionId });
      if (bucket.isAboveThreshold({ subscriptionId })) {
        process.send?.({
          type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION,
          payload: { subscriptionId },
        });
      }
      break;
    case LeakyBucketMessageTypes.RESET:
      bucket.resetCountFor({ subscriptionId });
      break;
    default:
      break;
  }
});

setInterval(() => {
  bucket.subscriptions.forEach((subscriptionId: string) => {
    const currentCount = bucket.fetchCountFor({ subscriptionId });
    const threshold = bucket.fetchThresholdFor({ subscriptionId });
    if (currentCount - threshold === 1) {
      process.send?.({ type: LeakyBucketMessageTypes.THRESHOLD_RESTORED, subscriptionId });
    }
    bucket.decrement({ subscriptionId });
  });
}, 1000);
