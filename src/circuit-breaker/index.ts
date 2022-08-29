// import { ChildProcess } from 'child_process';
// import { Request, Response } from 'express';

// import ILogger from '../monitoring/logger';
// import { LeakyBucketMessage } from '../leaky-bucket/types';
// import GlobalConfig from '../global-config';
// import CircuitBreakerState from './state';
// import CircuitBreakerClosedState from './state/closed';
// import CircuitBreakerHalfOpenState from './state/half-open';
// import CircuitBreakerOpenState from './state/open';
// import { CircuitBreakerStatus } from './status';

export default interface CircuitBreaker {
  open(): void;
  halfOpen(): void;
  close(): void;
  registerFailure(): void;
}

