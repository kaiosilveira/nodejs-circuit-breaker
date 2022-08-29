import { EventEmitter } from 'events';
import CircuitBreaker from '..';
import { CircuitBreakerStatus } from '../status';

export default class FakeCircuitBreaker extends EventEmitter implements CircuitBreaker {
  getStatus(): CircuitBreakerStatus {
    return CircuitBreakerStatus.CLOSED;
  }

  getIdentifier(): string {
    return 'abc';
  }

  open(): void {}
  halfOpen(): void {}
  close(): void {}
  registerFailure(): void {}
}
