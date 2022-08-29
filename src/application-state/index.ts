import { CircuitBreakerStatus } from '../circuit-breaker/status';

export default interface ApplicationState {
  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void;
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
}