import http from 'http';
import Express from 'express';
import Path from 'path';
import * as ChildProcess from 'child_process';

const PORT: Number = 3000;
const app = Express();

const subscriptionId = '3';
const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/LeakyBucket/process-definition`);

LeakyBucket.on('message', msg => {
  console.log('> msg from LeakyBucket', msg);
});

LeakyBucket.send({ type: 'REGISTER', payload: { subscriptionId, threshold: 10 } });

setInterval(() => {
  LeakyBucket.send({ type: 'NEW_FAILURE', payload: { subscriptionId } } as LeakyBucketMessage);
}, 250);

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
