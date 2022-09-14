import IncomingRequestMiddleware from '.';
import FakeLogger from '../../../../app/infra/logger/fake';
import FakeExpressRequest from '../../../../../test/fakes/express/http/request';
import FakeExpressResponse from '../../../../../test/fakes/express/http/response';
import { Request, Response } from 'express';

describe('IncomingRequestMiddleware', () => {
  it('should create a context for the request with an actionUUID', () => {
    const generatedUUID = 'abc';
    const generateUUID = jest.fn().mockReturnValue(generatedUUID);
    const next = jest.fn();

    const req = new FakeExpressRequest({ body: {}, headers: {} }) as unknown as Request;
    const res = new FakeExpressResponse() as unknown as Response;

    new IncomingRequestMiddleware({ logger: new FakeLogger(), generateUUID }).hook(req, res, next);

    expect(req.context?.actionUUID).toEqual(generatedUUID);
    expect(generateUUID).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
