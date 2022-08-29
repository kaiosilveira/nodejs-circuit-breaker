import CircuitBreakerState from '..';
import CircuitBreaker from '../..';
import ILogger from '../../../monitoring/logger';
import { CircuitBreakerStatus } from '../../status';

export default class CircuitBreakerOpenState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }: { circuitBreaker: CircuitBreaker; logger: ILogger }) {
    super({ circuitBreaker, logger, status: CircuitBreakerStatus.OPEN });
    this.circuitBreaker = circuitBreaker;
    this.status = CircuitBreakerStatus.OPEN;
  }

  handleOkResponse(): void {}

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}
