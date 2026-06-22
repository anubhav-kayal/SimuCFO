const fs = require('fs');
const path = require('path');
const sessionStore = require('../utils/sessionStore');
const logger = require('../utils/logger');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const VENV_PYTHON = path.join(__dirname, '..', '..', 'venv', 'bin', 'python');
const FOLLOW_UP_SCRIPT = path.join(__dirname, '..', '..', 'ml-simulator', 'follow_up.py');
const FOLLOW_UP_DIR = path.join(__dirname, '..', '..', 'ml-simulator');
const INPUT_FILE = path.join(FOLLOW_UP_DIR, 'follow_up_input.json');
const OUTPUT_FILE = path.join(FOLLOW_UP_DIR, 'follow_up_output.json');

const EXEC_TIMEOUT_MS = 120_000;

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').slice(0, 2000);
}

exports.handleAsk = async (req, res) => {
  try {
    const { sessionId, question } = req.body;
    if (!sessionId || !question) {
      return res.status(400).json({ message: 'sessionId and question are required' });
    }

    const cleanQuestion = sanitize(question);
    if (!cleanQuestion) {
      return res.status(400).json({ message: 'Question cannot be empty' });
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found or expired. Please re-upload.' });
    }

    const conversation = session.conversation || [];
    const mcFacts = session.monteCarloFacts || {};

    // Write input for Python follow-up script
    const inputData = {
      new_question: cleanQuestion,
      conversation: conversation,
      mc_facts: mcFacts,
      generate_plot: false,
      generate_fan_charts: false,
    };

    // Clean up stale files
    for (const f of [INPUT_FILE, OUTPUT_FILE]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    fs.writeFileSync(INPUT_FILE, JSON.stringify(inputData, null, 2));

    logger.info('Running follow-up analysis', { sessionId, question: cleanQuestion });

    const command = `"${VENV_PYTHON}" "${FOLLOW_UP_SCRIPT}"`;
    const { stdout, stderr } = await exec(command, {
      timeout: EXEC_TIMEOUT_MS,
      cwd: FOLLOW_UP_DIR,
    });

    if (stderr) {
      logger.warn('Follow-up Python stderr', { stderr });
    }

    let output;
    try {
      output = JSON.parse(stdout);
    } catch {
      const fileOutput = readJsonIfExists(OUTPUT_FILE);
      if (fileOutput) {
        output = fileOutput;
      } else {
        throw new Error('Failed to parse follow-up output');
      }
    }

    // Update session with new conversation
    session.conversation = output.conversation || [];
    sessionStore.update(sessionId, session);

    return res.status(200).json({
      message: 'Follow-up analysis completed.',
      data: {
        question: cleanQuestion,
        answer: output.result?.answer || {},
        reasoning: output.result?.reasoning || '',
        statistics: output.result?.statistics || {},
      },
    });
  } catch (error) {
    logger.error('Ask handler error', { error: error.message });
    return res.status(500).json({ message: error.message });
  }
};

function readJsonIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}
