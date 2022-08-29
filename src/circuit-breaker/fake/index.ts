import CircuitBreaker from '..';

export default class FakeCircuitBreaker implements CircuitBreaker {
  open(): void {}
  halfOpen(): void {}
  close(): void {}
  registerFailure(): void {}
}
