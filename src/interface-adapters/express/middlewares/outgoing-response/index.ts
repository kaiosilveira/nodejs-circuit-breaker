import ILogger from '../../../../app/infra/logger';
import { Request, Response } from 'express';

export default class OutgoingResponseMiddleware {
  _logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this._logger = logger;
    this.hook = this.hook.bind(this);
  }

  hook(req: Request, res: Response, next: Function): void {
    res.on('finish', () => {
      const ctx = req.context;

      const durationMs = +new Date() - (ctx?.reqStartedAt ?? 0);
      this._logger.info({
        message: `${ctx?.method.toUpperCase()} ${ctx?.url} ${res.statusCode} (${durationMs}ms)`,
        status: res.statusCode,
        durationMs,
        ...req.context,
      });
    });

    next();
  }
}
