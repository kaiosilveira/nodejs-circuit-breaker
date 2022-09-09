import { EventEmitter } from 'node:events';
import { CircuitBreakerStatus } from './status';

export enum CircuitBreakerEvents {
  CIRCUIT_BREAKER_STATE_UPDATED = 'CIRCUIT_BREAKER_STATE_UPDATED',
}

export type CircuitBreakerDescription = {
  circuitBreakerId: string;
  state: CircuitBreakerStatus;
};

export default interface CircuitBreaker extends EventEmitter {
  open(): void;
  halfOpen(): void;
  close(): void;
  registerFailure(): void;
  getIdentifier(): string;
  getStatus(): CircuitBreakerStatus;
  describe(): CircuitBreakerDescription;
}
