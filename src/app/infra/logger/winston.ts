import ILogger from '.';
import winston from 'winston';

export default class ManagedWinstonLogger implements ILogger {
  _logger;

  constructor({ defaultMeta = {} }) {
    this._logger = winston.createLogger({
      defaultMeta,
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console({ format: winston.format.simple() })],
    });
  }

  info(obj: any): void {
    this._logger.info(JSON.stringify(obj));
  }

  error(obj: any): void {
    this._logger.error(JSON.stringify(obj));
  }

  child(defaultMeta): ILogger {
    return new ManagedWinstonLogger({ defaultMeta });
  }
}
