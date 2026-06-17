const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { rm } = require('fs/promises');

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
    console.warn(`[${path.basename(scriptPath)}] stderr:`, stderr);
  }
  return stdout;
}

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').slice(0, 2000);
}

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

    // 2. Download all PDFs from Supabase to inputs folder
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
        console.error(`Error downloading ${file.name}:`, downloadError);
        continue;
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      fs.writeFileSync(path.join(INPUTS_DIR, file.name), Buffer.from(arrayBuffer));
    }

    console.log('All PDFs downloaded to inputs/');

    // 3. Run PDF Processor
    console.log('Running PDF Processor...');
    await runPythonScript(PDF_SCRIPT);

    // 4. Run Monte Carlo Simulation
    const finalQuestion = userQuestion || 'Run a comprehensive financial risk analysis';
    console.log(`Running Monte Carlo with question: "${finalQuestion}"`);
    await runPythonScript(MC_SCRIPT, [finalQuestion], { cwd: MC_OUTPUT_DIR });

    // 5. Read output files
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

    return res.status(200).json({
      message: 'Analysis completed successfully.',
      files: uploadedFiles,
      data: responseData,
    });
  } catch (error) {
    console.error('Upload handler error:', error);
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
