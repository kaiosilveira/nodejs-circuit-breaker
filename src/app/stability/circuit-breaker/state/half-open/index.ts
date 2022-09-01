import CircuitBreakerState from '..';
import ExpressCircuitBreaker from '../..';
import ILogger from '../../../../infra/logger';
import { CircuitBreakerStatus } from '../../status';

export type CircuitBreakerHalfOpenStateProps = {
  circuitBreaker: ExpressCircuitBreaker;
  logger: ILogger;
};
export default class CircuitBreakerHalfOpenState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }) {
    super({ status: CircuitBreakerStatus.HALF_OPEN, circuitBreaker, logger });
  }

  handleOkResponse(): void {
    this.circuitBreaker.close();
    this.logger.info({
      msg: 'Successful response while in a HALF_OPEN state. Closing the circuit.',
      status: this.status,
    });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.open();
    this.logger.info({
      msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
      status: this.status,
    });

    this.circuitBreaker.registerFailure();
  }
}
