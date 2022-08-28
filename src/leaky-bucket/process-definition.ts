import LeakyBucket from '.';
import { LeakyBucketMessage } from './types';

const bucket = new LeakyBucket();

process.on('message', (msg: LeakyBucketMessage) => {
  const { subscriptionId } = msg.payload;
  switch (msg.type) {
    case 'REGISTER':
      bucket.subscribe({ subscriptionId, threshold: msg.payload.threshold });
      break;
    case 'NEW_FAILURE':
      bucket.increment({ subscriptionId });
      if (bucket.isAboveThreshold({ subscriptionId })) {
        process.send?.({ type: 'THRESHOLD_VIOLATION', payload: { subscriptionId } });
      }
      break;
    case 'RESET':
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
      process.send?.({ type: 'THRESHOLD_RESTORED', subscriptionId });
    }
    bucket.decrement({ subscriptionId });
  });
}, 1000);
