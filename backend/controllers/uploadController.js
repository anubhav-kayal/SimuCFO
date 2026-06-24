const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { rm } = require('fs/promises');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const sessionStore = require('../utils/sessionStore');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const INPUTS_DIR = path.join(__dirname, '..', '..', 'data-scripts', 'inputs');
const VENV_PYTHON = path.join(__dirname, '..', '..', 'venv', 'bin', 'python');
const PDF_SCRIPT = path.join(__dirname, '..', '..', 'data-scripts', 'extractors', 'pdfProcessor.py');
const MC_SCRIPT = path.join(__dirname, '..', '..', 'ml-simulator', 'montecarlo.py');
const MC_OUTPUT_DIR = path.join(__dirname, '..', '..', 'ml-simulator');

const EXEC_TIMEOUT_MS = 300_000;

function readJsonIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return null;
}

async function runPythonScript(scriptPath, args = [], options = {}) {
  const quotedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ');
  const command = `"${VENV_PYTHON}" "${scriptPath}" ${quotedArgs}`;
  const { stdout, stderr } = await exec(command, {
    timeout: EXEC_TIMEOUT_MS,
    ...options,
  });
  if (stderr) {
    logger.warn('Python stderr', { script: path.basename(scriptPath), stderr });
  }
  return stdout;
}

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').slice(0, 2000);
}

exports.handleCompare = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let scenarios;
    try {
      scenarios = JSON.parse(req.body.scenarios);
    } catch {
      return res.status(400).json({ message: 'Invalid scenarios JSON' });
    }

    if (!Array.isArray(scenarios) || scenarios.length < 2) {
      return res.status(400).json({ message: 'At least 2 scenarios required' });
    }

    for (const s of scenarios) {
      if (!s.name) s.name = 'Unnamed';
      if (!s.overrides) s.overrides = {};
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileContent = fs.readFileSync(file.path);
      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(file.filename, fileContent, { contentType: 'application/pdf', upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage.from('pdfs').getPublicUrl(data.path);
      uploadedFiles.push({
        originalName: file.originalname,
        storedName: file.filename,
        supabasePath: data.path,
        publicUrl: publicData.publicUrl,
      });
    }

    const { data: fileList, error: listError } = await supabase.storage.from('pdfs').list();
    if (listError) throw new Error(`Failed to list files: ${listError.message}`);

    if (!fs.existsSync(INPUTS_DIR)) fs.mkdirSync(INPUTS_DIR, { recursive: true });

    for (const file of fileList) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(file.name);
      if (downloadError) {
        logger.error('Download error', { fileName: file.name, error: downloadError.message });
        continue;
      }
      const arrayBuffer = await fileBlob.arrayBuffer();
      fs.writeFileSync(path.join(INPUTS_DIR, file.name), Buffer.from(arrayBuffer));
    }

    logger.info('Running PDF Processor...');
    await runPythonScript(PDF_SCRIPT);

    const scenariosJson = JSON.stringify(scenarios);
    logger.info('Running Scenario Comparison', { scenarioCount: scenarios.length });
    const stdout = await runPythonScript(MC_SCRIPT, ['--compare', scenariosJson], { cwd: MC_OUTPUT_DIR });

    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      throw new Error('Failed to parse scenario comparison output');
    }

    const responseData = {
      scenarios: result.scenario_comparison?.scenarios || [],
      plot: result.plot ? `data:image/png;base64,${result.plot}` : null,
      num_simulations: result.scenario_comparison?.num_simulations || 10000,
    };

    return res.status(200).json({
      message: 'Scenario comparison completed successfully.',
      files: uploadedFiles,
      data: responseData,
    });
  } catch (error) {
    logger.error('Compare handler error', { error: error.message });
    return res.status(500).json({ message: error.message });
  } finally {
    fs.readdir(UPLOADS_DIR, (_, entries) => {
      if (!entries) return;
      for (const entry of entries) {
        fs.unlink(path.join(UPLOADS_DIR, entry), () => {});
      }
    });
  }
};

exports.handleSensitivity = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const fileContent = fs.readFileSync(file.path);
      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(file.filename, fileContent, { contentType: 'application/pdf', upsert: false });

      if (error) throw error;

      const { data: publicData } = supabase.storage.from('pdfs').getPublicUrl(data.path);
      uploadedFiles.push({
        originalName: file.originalname,
        storedName: file.filename,
        supabasePath: data.path,
        publicUrl: publicData.publicUrl,
      });
    }

    const { data: fileList, error: listError } = await supabase.storage.from('pdfs').list();
    if (listError) throw new Error(`Failed to list files: ${listError.message}`);

    if (!fs.existsSync(INPUTS_DIR)) fs.mkdirSync(INPUTS_DIR, { recursive: true });

    for (const file of fileList) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      const { data: fileBlob, error: downloadError } = await supabase.storage.from('pdfs').download(file.name);
      if (downloadError) {
        logger.error('Download error', { fileName: file.name, error: downloadError.message });
        continue;
      }
      const arrayBuffer = await fileBlob.arrayBuffer();
      fs.writeFileSync(path.join(INPUTS_DIR, file.name), Buffer.from(arrayBuffer));
    }

    logger.info('Running PDF Processor...');
    await runPythonScript(PDF_SCRIPT);

    logger.info('Running Sensitivity Analysis...');
    const stdout = await runPythonScript(MC_SCRIPT, ['--sensitivity'], { cwd: MC_OUTPUT_DIR });

    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      throw new Error('Failed to parse sensitivity analysis output');
    }

    const responseData = {
      sensitivity: result.sensitivity || null,
      plots: result.plots || {},
    };

    if (responseData.plots) {
      for (const [key, val] of Object.entries(responseData.plots)) {
        if (typeof val === 'string') {
          responseData.plots[key] = `data:image/png;base64,${val}`;
        }
      }
    }

    return res.status(200).json({
      message: 'Sensitivity analysis completed successfully.',
      files: uploadedFiles,
      data: responseData,
    });
  } catch (error) {
    logger.error('Sensitivity handler error', { error: error.message });
    return res.status(500).json({ message: error.message });
  } finally {
    fs.readdir(UPLOADS_DIR, (_, entries) => {
      if (!entries) return;
      for (const entry of entries) {
        fs.unlink(path.join(UPLOADS_DIR, entry), () => {});
      }
    });
  }
};

exports.handleUpload = async (req, res) => {
  try {
    const files = req.files && req.files.length ? req.files : (req.file ? [req.file] : []);

    if (!files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userQuestion = sanitize(req.body.question || '');

    const uploadedFiles = [];

    // 1. Upload files to Supabase
    for (const file of files) {
      const fileContent = fs.readFileSync(file.path);

      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(file.filename, fileContent, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(data.path);

      uploadedFiles.push({
        originalName: file.originalname,
        storedName: file.filename,
        supabasePath: data.path,
        publicUrl: publicData.publicUrl,
      });
    }

    // 2. Check cache
    const cacheKey = cache.makeKey(userQuestion, files);
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit — returning cached analysis', { cacheKey });
      return res.status(200).json({
        message: 'Analysis completed successfully (cached).',
        files: uploadedFiles,
        data: cached,
      });
    }

    // 3. Download all PDFs from Supabase to inputs folder
    const { data: fileList, error: listError } = await supabase.storage
      .from('pdfs')
      .list();

    if (listError) {
      throw new Error(`Failed to list files from Supabase: ${listError.message}`);
    }

    if (!fs.existsSync(INPUTS_DIR)) {
      fs.mkdirSync(INPUTS_DIR, { recursive: true });
    }

    for (const file of fileList) {
      if (file.name === '.emptyFolderPlaceholder') continue;

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('pdfs')
        .download(file.name);

      if (downloadError) {
        logger.error('Error downloading file from Supabase', { fileName: file.name, error: downloadError.message });
        continue;
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      fs.writeFileSync(path.join(INPUTS_DIR, file.name), Buffer.from(arrayBuffer));
    }

    logger.info('All PDFs downloaded to inputs/');

    // 4. Run PDF Processor
    logger.info('Running PDF Processor...');
    await runPythonScript(PDF_SCRIPT);

    // 5. Run Monte Carlo Simulation
    const finalQuestion = userQuestion || 'Run a comprehensive financial risk analysis';
    logger.info('Running Monte Carlo', { question: finalQuestion });
    await runPythonScript(MC_SCRIPT, [finalQuestion], { cwd: MC_OUTPUT_DIR });

    // 6. Read output files
    const fullAnalysisPath = path.join(MC_OUTPUT_DIR, 'monte_carlo_analysis.json');
    const metricsPath = path.join(MC_OUTPUT_DIR, 'computed_metrics.json');
    const plotPath = path.join(MC_OUTPUT_DIR, 'monte_carlo_bell_curve.png');
    const fanChartRevenuePath = path.join(MC_OUTPUT_DIR, 'fan_chart_revenue.png');
    const fanChartCashPath = path.join(MC_OUTPUT_DIR, 'fan_chart_cash.png');
    const interpretationPath = path.join(MC_OUTPUT_DIR, 'financial_analysis_interpretation.txt');

    const fullAnalysis = readJsonIfExists(fullAnalysisPath);
    const metrics = readJsonIfExists(metricsPath);

    let responseData = {};

    if (fullAnalysis) {
      responseData = {
        question: finalQuestion,
        answer: fullAnalysis.analysis_results?.computed_answer || {},
        reasoning: fullAnalysis.analysis_results?.llm_explanation || 'Analysis completed.',
        statementChunks: fullAnalysis.monte_carlo_simulation?.statement_chunks || null,
        dataQuality: fullAnalysis.monte_carlo_simulation?.data_quality || null,
        ratioDashboard: fullAnalysis.ratio_dashboard || null,
      };
    } else if (metrics) {
      responseData = {
        question: finalQuestion,
        answer: metrics,
        reasoning: 'Analysis completed (Metrics only).',
      };
    } else {
      throw new Error('No analysis output file found.');
    }

    if (fs.existsSync(plotPath)) {
      responseData.plotImage = `data:image/png;base64,${fs.readFileSync(plotPath, 'base64')}`;
    }

    const fanCharts = {};
    if (fs.existsSync(fanChartRevenuePath)) {
      fanCharts.revenue = `data:image/png;base64,${fs.readFileSync(fanChartRevenuePath, 'base64')}`;
    }
    if (fs.existsSync(fanChartCashPath)) {
      fanCharts.cash = `data:image/png;base64,${fs.readFileSync(fanChartCashPath, 'base64')}`;
    }
    if (Object.keys(fanCharts).length > 0) {
      responseData.fanCharts = fanCharts;
    }

    if (fs.existsSync(interpretationPath)) {
      responseData.interpretation = fs.readFileSync(interpretationPath, 'utf8');
    }

    cache.set(cacheKey, responseData);

    const sessionId = sessionStore.create({
      question: finalQuestion,
      files: uploadedFiles,
      conversation: [
        { role: 'user', content: finalQuestion },
        { role: 'assistant', content: responseData.reasoning || '' },
      ],
      monteCarloFacts: fullAnalysis?.monte_carlo_facts || null,
      ratioDashboard: responseData.ratioDashboard || null,
    });

    return res.status(200).json({
      message: 'Analysis completed successfully.',
      files: uploadedFiles,
      sessionId,
      data: responseData,
    });
  } catch (error) {
    logger.error('Upload handler error', { error: error.message });
    return res.status(500).json({ message: error.message });
  } finally {
    // Clean up temp uploaded files (best-effort, don't block response)
    fs.readdir(UPLOADS_DIR, (_, entries) => {
      if (!entries) return;
      for (const entry of entries) {
        fs.unlink(path.join(UPLOADS_DIR, entry), () => {});
      }
    });
  }
};
