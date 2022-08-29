import CircuitBreaker from '../circuit-breaker';
import { CircuitBreakerStatus } from '../circuit-breaker/status';

export default interface ApplicationState {
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void;
}
