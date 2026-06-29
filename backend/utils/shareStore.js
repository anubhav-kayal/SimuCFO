const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SHARES_DIR = path.join(__dirname, '..', 'shares');

if (!fs.existsSync(SHARES_DIR)) {
  fs.mkdirSync(SHARES_DIR, { recursive: true });
}

function create(sessionData) {
  const token = crypto.randomBytes(16).toString('hex');
  const entry = {
    token,
    data: sessionData,
    createdAt: Date.now(),
    expiresAt: Date.now() + SHARE_TTL_MS,
  };
  const filePath = path.join(SHARES_DIR, `${token}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
  logger.info('Share created', { token });
  return token;
}

function get(token) {
  const filePath = path.join(SHARES_DIR, `${token}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const entry = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Date.now() > entry.expiresAt) {
      fs.unlinkSync(filePath);
      logger.info('Share expired', { token });
      return null;
    }
    return entry.data;
  } catch {
    fs.unlinkSync(filePath);
    return null;
  }
}

module.exports = { create, get };
