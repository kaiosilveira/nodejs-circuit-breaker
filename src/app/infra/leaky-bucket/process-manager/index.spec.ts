import { LeakyBucketProcessManagerImpl } from '.';
import { LeakyBucketMessageTypes } from '../messages';
import FakeLeakyBucket from '../leaky-bucket/fake';

describe('LeakyBucketProcessImpl', () => {
  const processRef = process;
  const subscriptionId = 'abc';
  const tickIntervalMs = 1000;

  describe('handleMessage', () => {
    afterEach(() => jest.resetAllMocks());

    describe('REGISTER', () => {
      it('should register a subscription into the bucket', () => {
        const threshold = 50;
        const bucket = new FakeLeakyBucket();
        const process = new LeakyBucketProcessManagerImpl({ bucket, processRef, tickIntervalMs });

        const spyOnSubscribe = jest.spyOn(bucket, 'subscribe');
        const msg = {
          type: LeakyBucketMessageTypes.REGISTER,
          payload: { subscriptionId, threshold },
        };

        process.handleMessage(msg);

        expect(spyOnSubscribe).toHaveBeenCalledTimes(1);
        expect(spyOnSubscribe).toHaveBeenCalledWith({ subscriptionId, threshold });
      });
    });

    describe('NEW_FAILURE', () => {
      it('should increment the counter for a given subscriptionId', () => {
        const bucket = new FakeLeakyBucket();

        const spyOnIncrement = jest.spyOn(bucket, 'increment');
        const msg = {
          type: LeakyBucketMessageTypes.NEW_FAILURE,
          payload: { subscriptionId },
        };

        const process = new LeakyBucketProcessManagerImpl({ bucket, tickIntervalMs, processRef });
        process.handleMessage(msg);

        expect(spyOnIncrement).toHaveBeenCalledTimes(1);
        expect(spyOnIncrement).toHaveBeenCalledWith({ subscriptionId });
      });

      it('should send a message if counters are above the threshold for a given subscriptionId', () => {
        const bucket = new FakeLeakyBucket();
        jest.spyOn(bucket, 'isAboveThreshold').mockReturnValue(true);

        const process = new LeakyBucketProcessManagerImpl({ bucket, processRef, tickIntervalMs });
        const spyOnSend = jest.spyOn(processRef, 'send');

        const msg = {
          type: LeakyBucketMessageTypes.NEW_FAILURE,
          payload: { subscriptionId },
        };

        process.handleMessage(msg);

        expect(spyOnSend).toHaveBeenCalledTimes(1);
        expect(spyOnSend).toHaveBeenCalledWith({
          type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION,
          payload: { subscriptionId },
        });
      });
    });

    describe('RESET', () => {
      it('should reset the counters for a given subscriptionId', () => {
        const bucket = new FakeLeakyBucket();

        const spyOnResetCount = jest.spyOn(bucket, 'resetCountFor');
        const msg = {
          type: LeakyBucketMessageTypes.RESET,
          payload: { subscriptionId },
        };

        const process = new LeakyBucketProcessManagerImpl({ bucket, tickIntervalMs, processRef });
        process.handleMessage(msg);

        expect(spyOnResetCount).toHaveBeenCalledTimes(1);
        expect(spyOnResetCount).toHaveBeenCalledWith({ subscriptionId });
      });
    });
  });

  describe('getTickIntervalInMs', () => {
    it('should return the configured tickIntervalMs', () => {
      const tickIntervalMs = 500;
      const processManager = new LeakyBucketProcessManagerImpl({
        tickIntervalMs,
        bucket: new FakeLeakyBucket(),
        processRef: process,
      });

      expect(processManager.getTickIntervalInMs()).toEqual(tickIntervalMs);
    });
  });
});
