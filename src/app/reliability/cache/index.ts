export default interface ApplicationCache {
  set(key: string, value: string): void;
  get(key: string): string | undefined;
}
