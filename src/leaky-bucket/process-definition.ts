import { LeakyBucketImpl } from './leaky-bucket';
import { LeakyBucketProcessManagerImpl } from './process-manager';

const processManager = new LeakyBucketProcessManagerImpl({
  processRef: process,
  bucket: new LeakyBucketImpl(),
  tickIntervalMs: 1000,
});

process.on('message', processManager.handleMessage);

setInterval(processManager.handleTick, processManager.getTickIntervalInMs());
