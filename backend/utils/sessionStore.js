const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

const sessions = new Map();

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Load persisted sessions on startup
function loadPersisted() {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
        const entry = JSON.parse(raw);
        if (Date.now() - entry.updatedAt > SESSION_TTL_MS) {
          fs.unlinkSync(path.join(SESSIONS_DIR, file));
          continue;
        }
        sessions.set(entry.id, entry);
      } catch {
        fs.unlinkSync(path.join(SESSIONS_DIR, file));
      }
    }
    logger.info('Sessions restored', { count: sessions.size });
  } catch (err) {
    logger.warn('Could not load persisted sessions', { error: err.message });
  }
}

function persist(id) {
  try {
    const session = sessions.get(id);
    if (!session) return;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session), 'utf-8');
  } catch (err) {
    logger.warn('Failed to persist session', { sessionId: id, error: err.message });
  }
}

function removeFile(id) {
  try {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function createId() {
  return crypto.randomUUID();
}

function create(sessionData) {
  const id = createId();
  const entry = {
    id,
    data: sessionData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(id, entry);
  persist(id);
  logger.info('Session created', { sessionId: id });
  return id;
}

function get(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(id);
    removeFile(id);
    logger.info('Session expired', { sessionId: id });
    return null;
  }
  session.updatedAt = Date.now();
  persist(id);
  return session.data;
}

function update(id, data) {
  const session = sessions.get(id);
  if (!session) return false;
  session.data = data;
  session.updatedAt = Date.now();
  persist(id);
  return true;
}

function remove(id) {
  const session = sessions.get(id);
  if (!session) return false;
  sessions.delete(id);
  removeFile(id);
  logger.info('Session deleted', { sessionId: id });
  return true;
}

function list() {
  const now = Date.now();
  const result = [];
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
      removeFile(id);
      continue;
    }
    result.push({ id, ...session });
  }
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}

function cleanup() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
      removeFile(id);
    }
  }
}

// Initialize
loadPersisted();
setInterval(cleanup, CLEANUP_INTERVAL_MS);

module.exports = { create, get, update, remove, list };