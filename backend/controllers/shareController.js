const shareStore = require('../utils/shareStore');
const sessionStore = require('../utils/sessionStore');
const logger = require('../utils/logger');

exports.handleCreateShare = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }
    const session = sessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found or expired' });
    }
    const token = shareStore.create(session);
    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${token}`;
    return res.status(200).json({ token, shareUrl });
  } catch (error) {
    logger.error('Share create error', { error: error.message });
    return res.status(500).json({ message: error.message });
  }
};

exports.handleGetShare = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    const data = shareStore.get(token);
    if (!data) {
      return res.status(404).json({ message: 'Share not found or expired' });
    }
    return res.status(200).json({ data });
  } catch (error) {
    logger.error('Share get error', { error: error.message });
    return res.status(500).json({ message: error.message });
  }
};
