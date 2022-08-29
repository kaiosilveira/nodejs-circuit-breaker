import { ChildProcess } from 'child_process';
import { CallbackRegistry } from '../../../../src/tooling/generic-types';

export default class FakeChildProcess extends ChildProcess {
  _callbacks: CallbackRegistry;

  constructor() {
    super();
    this._callbacks = {};
  }

  send(message) {
    Object.values(this._callbacks).map(cb => cb(message));
    return true;
  }

  on(event: string, callback: Function) {
    this._callbacks[event] = callback;
    return this;
  }
}
