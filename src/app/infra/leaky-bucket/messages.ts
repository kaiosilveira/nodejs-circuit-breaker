export enum LeakyBucketMessageTypes {
  REGISTER = 'REGISTER',
  NEW_FAILURE = 'NEW_FAILURE',
  RESET = 'RESET',
  THRESHOLD_VIOLATION = 'THRESHOLD_VIOLATION',
  THRESHOLD_RESTORED = 'THRESHOLD_RESTORED',
}

export interface LeakyBucketMessage {
  type: string;
  payload: any;
}
