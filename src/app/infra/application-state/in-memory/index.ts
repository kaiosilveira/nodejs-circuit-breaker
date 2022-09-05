import ApplicationState from '..';
import CircuitBreaker, { CircuitBreakerEvents } from '../../../stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../../stability/circuit-breaker/status';

export default class InMemoryApplicationState implements ApplicationState {
  CIRCUIT_BREAKERS: Object;
  _circuitBreakers: Array<CircuitBreaker>;

  constructor() {
    this.CIRCUIT_BREAKERS = {};
    this._circuitBreakers = [];
  }

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    const circuitBreaker = this._circuitBreakers.find(cb => cb.getIdentifier() === circuitBreakerId);
    if (!circuitBreaker)
      throw new Error('No registered circuit breakers were found for the given identifier');

    return circuitBreaker.getStatus();
  }

  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void {
    this.CIRCUIT_BREAKERS[circuitBreaker.getIdentifier()] = circuitBreaker.getStatus();
    this._circuitBreakers.push(circuitBreaker);
    circuitBreaker.on(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, data => {
      this.CIRCUIT_BREAKERS[data.circuitBreakerId] = data.newState;
    });
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
