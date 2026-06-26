const crypto = require('crypto');
const logger = require('./logger');

const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

const sessions = new Map();

function createId() {
  return crypto.randomUUID();
}

function create(sessionData) {
  const id = createId();
  sessions.set(id, {
    data: sessionData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  logger.info('Session created', { sessionId: id });
  return id;
}

function get(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(id);
    logger.info('Session expired', { sessionId: id });
    return null;
  }
  session.updatedAt = Date.now();
  return session.data;
}

function update(id, data) {
  const session = sessions.get(id);
  if (!session) return false;
  session.data = data;
  session.updatedAt = Date.now();
  return true;
}

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS);

function list() {
  const now = Date.now();
  const result = [];
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
      continue;
    }
    result.push({ id, ...session });
  }
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}

module.exports = { create, get, update, list };
