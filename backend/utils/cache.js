const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const DEFAULT_TTL_MS = 60 * 60 * 1000;

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function makeKey(question, files) {
  const sorted = [...files].sort((a, b) => {
    if (a.originalname < b.originalname) return -1;
    if (a.originalname > b.originalname) return 1;
    return a.size - b.size;
  });
  const payload = question + '|' + sorted.map(f => `${f.originalname}:${f.size}`).join(',');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function get(key) {
  const filePath = path.join(CACHE_DIR, key + '.json');
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw);

    if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
      fs.unlinkSync(filePath);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

function set(key, data) {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const filePath = path.join(CACHE_DIR, key + '.json');
  const entry = JSON.stringify({ timestamp: Date.now(), data });
  fs.writeFileSync(filePath, entry, 'utf-8');
}

module.exports = { makeKey, get, set };
