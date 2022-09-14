import ApplicationCache from '.';

export default class FakeApplicationCache implements ApplicationCache {
  set(key: string, value: string): void {
    throw new Error('Method not implemented.');
  }
  get(key: string): string | undefined {
    throw new Error('Method not implemented.');
  }
}
