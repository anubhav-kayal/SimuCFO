const assert = require('node:assert');
const { describe, it, beforeEach, afterEach } = require('node:test');
const fs = require('fs');
const path = require('path');
const cache = require('../utils/cache');

const CACHE_DIR = path.join(__dirname, '..', 'cache');

describe('cache', () => {
  beforeEach(() => {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true });
    }
  });

  it('should generate consistent keys for same input', () => {
    const k1 = cache.makeKey('question', [
      { originalname: 'a.pdf', size: 100 },
      { originalname: 'b.pdf', size: 200 },
    ]);
    const k2 = cache.makeKey('question', [
      { originalname: 'b.pdf', size: 200 },
      { originalname: 'a.pdf', size: 100 },
    ]);
    assert.strictEqual(k1, k2);
  });

  it('should generate different keys for different questions', () => {
    const k1 = cache.makeKey('q1', [{ originalname: 'a.pdf', size: 100 }]);
    const k2 = cache.makeKey('q2', [{ originalname: 'a.pdf', size: 100 }]);
    assert.notStrictEqual(k1, k2);
  });

  it('should generate different keys for different files', () => {
    const k1 = cache.makeKey('q', [{ originalname: 'a.pdf', size: 100 }]);
    const k2 = cache.makeKey('q', [{ originalname: 'b.pdf', size: 100 }]);
    assert.notStrictEqual(k1, k2);
  });

  it('should return null for cache miss', () => {
    assert.strictEqual(cache.get('nonexistent-key'), null);
  });

  it('should store and retrieve data', () => {
    const data = { answer: 42, reasoning: 'test' };
    cache.set('test-key', data);
    const retrieved = cache.get('test-key');
    assert.deepStrictEqual(retrieved, data);
  });

  it('should handle complex nested data', () => {
    const data = {
      question: 'test',
      answer: { revenue: 100, profit: 50 },
      plotImage: 'data:image/png;base64,abc123',
      fanCharts: { revenue: 'data:image/png;base64,def456' },
    };
    cache.set('complex-key', data);
    const retrieved = cache.get('complex-key');
    assert.deepStrictEqual(retrieved, data);
  });
});
