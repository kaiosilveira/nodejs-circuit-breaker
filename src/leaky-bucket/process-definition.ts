import { LeakyBucketImpl } from '.';
import { LeakyBucketMessages } from './messages';
import { LeakyBucketMessage } from './types';

const bucket = new LeakyBucketImpl();

process.on('message', (msg: LeakyBucketMessage) => {
  const { subscriptionId } = msg.payload;
  switch (msg.type) {
    case LeakyBucketMessages.REGISTER:
      bucket.subscribe({ subscriptionId, threshold: msg.payload.threshold });
      break;
    case LeakyBucketMessages.NEW_FAILURE:
      bucket.increment({ subscriptionId });
      if (bucket.isAboveThreshold({ subscriptionId })) {
        process.send?.({
          type: LeakyBucketMessages.THRESHOLD_VIOLATION,
          payload: { subscriptionId },
        });
      }
      break;
    case LeakyBucketMessages.RESET:
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
      process.send?.({ type: LeakyBucketMessages.THRESHOLD_RESTORED, subscriptionId });
    }
    bucket.decrement({ subscriptionId });
  });
}, 1000);
