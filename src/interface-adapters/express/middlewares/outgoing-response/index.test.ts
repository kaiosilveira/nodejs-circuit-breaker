import OutgoingResponseMiddleware from '.';

import * as httpVerbs from '../../http/verbs';
import * as httpCodes from '../../http/status-codes';
import FakeLogger from '../../../../app/infra/logger/fake';
import FakeExpressResponse from '../../../../../test/fakes/express/http/response';
import { Request, Response } from 'express';

describe('OutgoingResponseMiddleware', () => {
  it('should log request status on res.finish', () => {
    const next = jest.fn();
    const method = httpVerbs.GET;
    const url = 'http://localhost:3000';
    const req = { context: { url, method } } as unknown as Request;
    const res = new FakeExpressResponse() as unknown as Response;
    const logger = new FakeLogger();

    const status = httpCodes.OK;
    const data = { ok: 1 };

    const spyOnLogInfo = jest.spyOn(logger, 'info');

    new OutgoingResponseMiddleware({ logger }).hook(req, res, next);
    const receivedResponse = res.status(status).json(data);
    expect(receivedResponse.body).toEqual(data);
    expect(receivedResponse.status).toEqual(status);

    res.emit('finish');

    expect(spyOnLogInfo).toHaveBeenCalledTimes(1);
    expect(spyOnLogInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('GET '),
        durationMs: expect.any(Number),
        status,
        method,
        url,
      })
    );
  });
});
