import ILogger from '.';

export default class FakeLogger implements ILogger {
  info(obj: any): void {}
  error(obj: any): void {}
}
