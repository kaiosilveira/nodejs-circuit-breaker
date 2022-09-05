import { EventEmitter } from 'events';
import CircuitBreaker from '..';
import { CircuitBreakerStatus } from '../status';

export default class FakeCircuitBreaker extends EventEmitter implements CircuitBreaker {
  _id: string;
  _status: CircuitBreakerStatus;

  constructor({ id } = { id: 'abc' }) {
    super();
    this._id = id;
    this._status = CircuitBreakerStatus.CLOSED;
  }

  getStatus(): CircuitBreakerStatus {
    return this._status;
  }

  getIdentifier(): string {
    return this._id;
  }

  open(): void {
    this._status = CircuitBreakerStatus.OPEN;
  }

  halfOpen(): void {
    this._status = CircuitBreakerStatus.HALF_OPEN;
  }

  close(): void {
    this._status = CircuitBreakerStatus.CLOSED;
  }

  registerFailure(): void {}
}
