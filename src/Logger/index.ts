export default interface ILogger {
  info(obj: any): void;
  error(obj: any): void;
}

export class ConsoleLogger implements ILogger {
  info(obj: any) {
    console.log(obj);
  }

  error(obj: any) {
    console.log(obj);
  }
}
