import { LeakyBucketImpl } from './leaky-bucket';
import { LeakyBucketProcessImpl } from './process';

const processManager = new LeakyBucketProcessImpl({
  processRef: process,
  bucket: new LeakyBucketImpl(),
  tickIntervalMs: 1000,
});

process.on('message', processManager.handleMessage);

setInterval(processManager.handleTick, processManager.getTickIntervalInMs());
