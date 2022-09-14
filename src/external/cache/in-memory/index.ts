import ApplicationCache from '../../../app/reliability/cache';

export default class InMemoryCache implements ApplicationCache {
  _REGISTRY: Object;

  constructor() {
    this._REGISTRY = {};
  }

  set(key: string, value: string): void {
    this._REGISTRY[key] = value;
  }

  get(key: string): string | undefined {
    return this._REGISTRY[key];
  }
}
