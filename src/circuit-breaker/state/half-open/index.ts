import CircuitBreakerState from '..';
import CircuitBreaker from '../..';
import ILogger from '../../../monitoring/logger';
import { CircuitBreakerStatus } from '../../status';

export default class CircuitBreakerHalfOpenState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }: { circuitBreaker: CircuitBreaker; logger: ILogger }) {
    super({ status: CircuitBreakerStatus.HALF_OPEN, circuitBreaker, logger });
  }

  handleOkResponse(): void {
    this.circuitBreaker.close();
    this.logger.info({
      msg: 'Successful response while in a HALF_OPEN state. Circuit is now closed.',
      status: this.circuitBreaker._state,
    });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.open();
    this.logger.info({
      msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
      status: this.circuitBreaker._state,
    });

    this.circuitBreaker.registerFailure();
  }
}
