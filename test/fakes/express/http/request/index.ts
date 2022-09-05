export default class FakeExpressRequest {
  body: Object;

  constructor({ body }) {
    this.body = body;
  }
}
