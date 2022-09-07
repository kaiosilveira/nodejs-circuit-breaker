import ApplicationState from '..';
import CircuitBreaker from '../../../stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../../stability/circuit-breaker/status';

export default class InMemoryApplicationState implements ApplicationState {
  _circuitBreakers: Array<CircuitBreaker>;

  constructor() {
    this._circuitBreakers = [];
  }

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    const circuitBreaker = this._circuitBreakers.find(
      cb => cb.getIdentifier() === circuitBreakerId
    );
    if (!circuitBreaker)
      throw new Error('No registered circuit breakers were found for the given identifier');

    return circuitBreaker.getStatus();
  }

  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void {
    this._circuitBreakers.push(circuitBreaker);
  }

  setCircuitBreakerState({ circuitBreakerId, state }): void {
    const circuitBreaker = this._circuitBreakers.find(
      cb => cb.getIdentifier() === circuitBreakerId
    );

    if (!circuitBreaker)
      throw new Error('No registered circuit breakers were found for the given identifier');

    switch (state) {
      case CircuitBreakerStatus.CLOSED:
        circuitBreaker.close();
        break;
      case CircuitBreakerStatus.OPEN:
        circuitBreaker.open();
        break;
      case CircuitBreakerStatus.HALF_OPEN:
        circuitBreaker.halfOpen();
        break;
      default:
        break;
    }
  }
}
