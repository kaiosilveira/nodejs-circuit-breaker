import { Request, Response } from 'express';
import ILogger from '../../../../app/infra/logger';

class IncomingRequestMiddleware {
  _logger: ILogger;
  _generateUUID: Function;

  constructor({ logger, generateUUID }: { logger: ILogger; generateUUID: Function }) {
    this._logger = logger;
    this._generateUUID = generateUUID;

    this.hook = this.hook.bind(this);
  }

  hook(req: Request, _: Response, next: Function): void {
    const context = {
      actionUUID: this._generateUUID(),
      reqStartedAt: +new Date(),
      method: req.method,
      url: req.url,
      userId: req.headers['x-user-id'],
    };

    req.context = context;
    next();
  }
}

export default IncomingRequestMiddleware;
