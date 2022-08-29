import CircuitBreaker from '..';
import ILogger from '../../monitoring/logger';
import { CircuitBreakerStatus } from '../status';

export default abstract class CircuitBreakerState {
  status: CircuitBreakerStatus;
  logger: ILogger;
  circuitBreaker: CircuitBreaker;

  constructor({
    circuitBreaker,
    logger,
    status,
  }: {
    circuitBreaker: CircuitBreaker;
    logger: ILogger;
    status: CircuitBreakerStatus;
  }) {
    this.logger = logger;
    this.circuitBreaker = circuitBreaker;
    this.status = status;
  }

  handleOkResponse() {}
  handleInternalServerErrorResponse() {
    this.circuitBreaker.registerFailure();
  }
}
