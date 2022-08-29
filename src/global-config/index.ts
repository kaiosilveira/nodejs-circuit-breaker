import { CircuitBreakerStatus } from '../circuit-breaker/status';

export default interface GlobalConfig {
  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void;
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
}
