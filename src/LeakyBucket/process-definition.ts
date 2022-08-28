import LeakyBucket from '.';

const bucket = new LeakyBucket();

process.on('message', (msg: LeakyBucketMessage) => {
  const { subscriptionId } = msg.payload;
  switch (msg.type) {
    case 'REGISTER':
      console.log(`> ${subscriptionId} registered`);
      bucket.subscribe({ subscriptionId, threshold: msg.payload.threshold });
      break;
    case 'NEW_FAILURE':
      console.log(
        `> new failure msg from ${subscriptionId} | current: ${bucket.fetchCountFor({
          subscriptionId,
        })} | threshold: ${bucket.fetchThresholdFor({ subscriptionId })}`
      );
      bucket.increment({ subscriptionId });
      if (bucket.isAboveThreshold({ subscriptionId })) {
        console.log(`> above threshold!!!`);
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
    bucket.decrement({ subscriptionId });
    console.log(
      `Reducing counters for ${subscriptionId}. Now at ${bucket.fetchCountFor({ subscriptionId })}`
    );
  });
}, 1000);
