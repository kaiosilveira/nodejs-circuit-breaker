import InMemoryCache from '.';

describe('InMemoryCache', () => {
  describe('set', () => {
    it('should add a value to the cache registry', () => {
      const key = 'key';
      const obj = { value: 'value' };
      const cache = new InMemoryCache();

      cache.set(key, JSON.stringify(obj));

      expect(JSON.parse(cache.get(key) || '')).toEqual(obj);
    });
  });
});
