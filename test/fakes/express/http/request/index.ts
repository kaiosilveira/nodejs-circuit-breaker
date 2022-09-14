export default class FakeExpressRequest {
  body: Object;
  headers: Object;

  constructor({ body, headers }: { body?: any; headers?: any } = { body: {}, headers: {} }) {
    this.body = body;
    this.headers = headers;
  }
}
