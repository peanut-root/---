const http = require("http");
const fs = require("fs");
const path = require("path");
const generateText = require("./api/generate-text.js");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STIMULI_DIR = path.join(ROOT, "stimuli");
const MASTER_CSV = path.join(DATA_DIR, "master-results.csv");
const SUBMISSIONS_JSON = path.join(DATA_DIR, "submissions.json");
const DEMO_CSV = path.join(DATA_DIR, "demo-results.csv");
const DEMO_SUBMISSIONS_JSON = path.join(DATA_DIR, "demo-submissions.json");
const HUMAN_PASSAGES_JSON = path.join(STIMULI_DIR, "human-passages.json");
const STIMULUS_POOL_JSON = path.join(STIMULI_DIR, "stimulus-pool.json");
const PORT = Number(process.env.PORT || 8765);

const CSV_FIELDS = [
  { header: "participant_label", key: "participant_label" },
  { header: "participant_number_assigned_by_server", key: "participant_number" },
  { header: "anonymous_participant_id", key: "participant_id" },
  { header: "submission_id", key: "submission_id" },
  { header: "actual_text_type", key: "text_type" },
  { header: "participant_authorship_judgment", key: "authorship_judgment" },
  { header: "background_education_level", key: "grade" },
  { header: "background_english_learning_years", key: "years_english_learning" },
  { header: "background_english_reading_proficiency_1to5", key: "english_reading_proficiency" },
  { header: "background_chinese_proficiency_1to5", key: "chinese_proficiency" },
  { header: "background_english_reading_frequency", key: "english_reading_frequency" },
  { header: "background_ai_tool_use_frequency", key: "ai_use_frequency" },
  { header: "background_ai_writing_familiarity_1to5", key: "ai_writing_familiarity" },
  { header: "server_received_timestamp", key: "server_received_at" },
  { header: "client_trial_timestamp", key: "timestamp" },
  { header: "trial_number_within_participant", key: "trial_number" },
  { header: "total_trials_assigned_to_participant", key: "selected_trial_count" },
  { header: "text_condition_code", key: "condition" },
  { header: "primary_authorship_response_duplicate", key: "response" },
  { header: "primary_authorship_rt_ms_duplicate", key: "rt_ms" },
  { header: "primary_authorship_accuracy_duplicate", key: "accuracy" },
  { header: "text_id", key: "text_id" },
  { header: "text_pair_id", key: "pair_id" },
  { header: "text_base_id", key: "base_text_id" },
  { header: "text_topic", key: "topic" },
  { header: "source_title", key: "source_title" },
  { header: "source_author", key: "source_author" },
  { header: "source_url", key: "source_url" },
  { header: "source_note", key: "source_note" },
  { header: "text_generation_model", key: "generation_model" },
  { header: "text_generation_temperature", key: "generation_temperature" },
  { header: "text_generation_prompt_version", key: "generation_prompt_version" },
  { header: "text_generation_api_base_url", key: "generation_api_base_url" },
  { header: "passage_word_count", key: "passage_word_count" },
  { header: "reading_page_time_ms", key: "reading_time_ms" },
  { header: "authorship_response_key", key: "authorship_response_key" },
  { header: "authorship_rt_ms", key: "authorship_rt_ms" },
  { header: "authorship_accuracy", key: "authorship_correct" },
  { header: "ai_likelihood_rating_1to5", key: "ai_likelihood_rating" },
  { header: "fluency_rating_1to5", key: "fluency_rating" },
  { header: "structure_rating_1to5", key: "structure_rating" },
  { header: "clarity_rating_1to5", key: "clarity_rating" },
  { header: "emotion_rating_1to5", key: "emotion_rating" },
  { header: "personal_voice_rating_1to5", key: "personal_voice_rating" },
  { header: "genericness_rating_1to5", key: "genericness_rating" },
  { header: "naturalness_rating_1to5", key: "naturalness_rating" },
  { header: "filler_task_type", key: "distractor_type" },
  { header: "filler_prompt", key: "distractor_prompt" },
  { header: "filler_answer", key: "distractor_answer" },
  { header: "filler_response_key", key: "distractor_response_key" },
  { header: "filler_accuracy", key: "distractor_correct" },
  { header: "filler_rt_ms", key: "distractor_rt_ms" },
  { header: "recognition_test_sentence", key: "recognition_sentence" },
  { header: "recognition_answer", key: "recognition_answer" },
  { header: "recognition_response_key", key: "recognition_response_key" },
  { header: "recognition_accuracy", key: "recognition_correct" },
  { header: "recognition_rt_ms", key: "recognition_rt_ms" },
  { header: "reconstruction_available_words", key: "scrambled_words" },
  { header: "reconstruction_selected_words_response", key: "reconstruction_response" },
  { header: "reconstruction_accuracy", key: "reconstruction_correct" },
  { header: "reconstruction_rt_ms", key: "reconstruction_rt_ms" }
];
const CSV_HEADERS = CSV_FIELDS.map(field => field.header);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(STIMULI_DIR, { recursive: true });
  ensureCsvFile(MASTER_CSV);
  ensureCsvFile(DEMO_CSV);
  if (!fs.existsSync(SUBMISSIONS_JSON)) {
    fs.writeFileSync(SUBMISSIONS_JSON, JSON.stringify({ nextParticipantNumber: 1, submissions: {} }, null, 2));
  }
  if (!fs.existsSync(DEMO_SUBMISSIONS_JSON)) {
    fs.writeFileSync(DEMO_SUBMISSIONS_JSON, JSON.stringify({ nextParticipantNumber: 1, submissions: {} }, null, 2));
  }
}

function stimulusPoolFallback() {
  const humanPool = readJsonFile(HUMAN_PASSAGES_JSON, { passages: [] });
  return {
    version: "matched-stimulus-pool-v1",
    locked: false,
    generated_at: null,
    generation: null,
    passages: Array.isArray(humanPool.passages) ? humanPool.passages : []
  };
}

function ensureCsvFile(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `${CSV_HEADERS.join(",")}\n`);
  } else {
    const current = fs.readFileSync(file, "utf8");
    const currentHeader = current.split(/\r?\n/, 1)[0] || "";
    if (currentHeader !== CSV_HEADERS.join(",")) {
      const rows = parseCsv(current);
      const migrated = [
        CSV_HEADERS.join(","),
        ...rows.map(row => CSV_FIELDS.map(field => csvValue(rowValue(row, field))).join(","))
      ].join("\n");
      fs.writeFileSync(file, `${migrated}\n`);
    }
  }
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function rowValue(row, field) {
  if (field.header === "participant_label") {
    return row.participant_label || participantLabel(row.participant_number_assigned_by_server || row.participant_number);
  }
  return row[field.header] ?? row[field.key] ?? "";
}

function participantLabel(number) {
  const parsed = Number(number);
  if (!Number.isFinite(parsed) || parsed < 1) return "";
  return `P${String(parsed).padStart(3, "0")}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function masterRows() {
  ensureDataFiles();
  return parseCsv(fs.readFileSync(MASTER_CSV, "utf8"));
}

function valueFrom(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function validateFormalRows(rows) {
  const selectedCount = Number(valueFrom(rows[0] || {}, "selected_trial_count", "total_trials_assigned_to_participant"));
  if (!Number.isInteger(selectedCount) || selectedCount < 9 || selectedCount > 12) {
    return "Formal submission is missing a valid assigned trial count.";
  }

  if (rows.length !== selectedCount) {
    return `Incomplete formal session: expected ${selectedCount} trial rows, received ${rows.length}.`;
  }

  const requiredFields = [
    ["trial_number", "trial_number_within_participant"],
    ["text_id"],
    ["text_type", "actual_text_type"],
    ["reading_time_ms", "reading_page_time_ms"],
    ["authorship_judgment", "participant_authorship_judgment"],
    ["authorship_response_key"],
    ["authorship_rt_ms"],
    ["ai_likelihood_rating"],
    ["distractor_answer", "filler_answer"],
    ["distractor_response_key", "filler_response_key"],
    ["distractor_rt_ms", "filler_rt_ms"],
    ["recognition_answer"],
    ["recognition_response_key"],
    ["recognition_rt_ms"],
    ["reconstruction_response", "reconstruction_selected_words_response"],
    ["reconstruction_rt_ms"]
  ];

  const incompleteIndex = rows.findIndex(row => requiredFields.some(keys => !valueFrom(row, ...keys)));
  if (incompleteIndex >= 0) {
    return `Incomplete formal session: trial row ${incompleteIndex + 1} is missing required answers or reaction times.`;
  }

  return "";
}

async function handleSubmitRows(req, res, options) {
  ensureDataFiles();
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON." });
    return;
  }

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    sendJson(res, 400, { error: "No rows were submitted." });
    return;
  }

  if (options.validateComplete) {
    const validationError = validateFormalRows(rows);
    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }
  }

  const submissionId = String(payload.submission_id || `submission-${Date.now()}`);
  const registry = readJsonFile(options.registryFile, { nextParticipantNumber: 1, submissions: {} });
  if (registry.submissions[submissionId]) {
    sendJson(res, 200, {
      ok: true,
      duplicate: true,
      participant_number: registry.submissions[submissionId].participant_number,
      row_count: registry.submissions[submissionId].row_count
    });
    return;
  }

  const participantNumber = registry.nextParticipantNumber;
  registry.nextParticipantNumber += 1;
  const receivedAt = new Date().toISOString();

  const lines = rows.map(row => {
    const enriched = {
      ...row,
      participant_number: participantNumber,
      participant_label: participantLabel(participantNumber),
      submission_id: submissionId,
      server_received_at: receivedAt
    };
    return CSV_FIELDS.map(field => csvValue(rowValue(enriched, field))).join(",");
  });

  fs.appendFileSync(options.csvFile, `${lines.join("\n")}\n`);
  registry.submissions[submissionId] = {
    participant_number: participantNumber,
    participant_id: rows[0]?.participant_id || "",
    row_count: rows.length,
    submitted_at: receivedAt
  };
  fs.writeFileSync(options.registryFile, JSON.stringify(registry, null, 2));

  sendJson(res, 200, {
    ok: true,
    participant_number: participantNumber,
    row_count: rows.length,
    csv_path: options.publicPath
  });
}

async function handleSubmitResults(req, res) {
  await handleSubmitRows(req, res, {
    csvFile: MASTER_CSV,
    registryFile: SUBMISSIONS_JSON,
    publicPath: "data/master-results.csv",
    validateComplete: true
  });
}

async function handleSubmitDemoResults(req, res) {
  await handleSubmitRows(req, res, {
    csvFile: DEMO_CSV,
    registryFile: DEMO_SUBMISSIONS_JSON,
    publicPath: "data/demo-results.csv"
  });
}

function handleHumanPassages(res) {
  ensureDataFiles();
  sendJson(res, 200, readJsonFile(HUMAN_PASSAGES_JSON, { passages: [] }));
}

async function handleStimulusPoolGet(res) {
  ensureDataFiles();
  sendJson(res, 200, readJsonFile(STIMULUS_POOL_JSON, stimulusPoolFallback()));
}

async function handleStimulusPoolSave(req, res) {
  ensureDataFiles();
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body || "{}");
  } catch {
    sendJson(res, 400, { error: "Invalid JSON." });
    return;
  }

  const passages = Array.isArray(payload.passages) ? payload.passages : [];
  if (!passages.length) {
    sendJson(res, 400, { error: "Stimulus pool must contain at least one passage." });
    return;
  }

  const missing = passages.find(item => !item.id || !item.text_type || !item.passage);
  if (missing) {
    sendJson(res, 400, { error: "Every stimulus must include id, text_type, and passage." });
    return;
  }

  const saved = {
    version: String(payload.version || "matched-stimulus-pool-v1"),
    locked: Boolean(payload.locked),
    generated_at: payload.generated_at || new Date().toISOString(),
    generation: payload.generation || null,
    passages
  };
  writeJsonFile(STIMULUS_POOL_JSON, saved);
  sendJson(res, 200, {
    ok: true,
    saved_count: passages.length,
    human_count: passages.filter(item => item.text_type === "Human-written").length,
    ai_count: passages.filter(item => item.text_type === "AI-generated").length,
    hybrid_count: passages.filter(item => item.text_type === "Human-AI hybrid").length,
    path: "stimuli/stimulus-pool.json"
  });
}

function handleResultsSummary(res) {
  const rows = masterRows();
  const participants = new Set(rows.map(row => row.participant_number_assigned_by_server || row.participant_number || row.anonymous_participant_id || row.participant_id).filter(Boolean));
  const byCondition = {};
  rows.forEach(row => {
    const condition = row.text_condition_code || row.condition || row.actual_text_type || row.text_type || "Unknown";
    if (!byCondition[condition]) byCondition[condition] = { rows: 0, rt: [], accuracy: [] };
    byCondition[condition].rows += 1;
    const rt = Number(row.primary_authorship_rt_ms_duplicate || row.rt_ms || row.authorship_rt_ms || row.recognition_rt_ms);
    const acc = Number(row.primary_authorship_accuracy_duplicate || row.accuracy || row.authorship_accuracy || row.authorship_correct || row.recognition_accuracy || row.recognition_correct);
    if (Number.isFinite(rt)) byCondition[condition].rt.push(rt);
    if (Number.isFinite(acc)) byCondition[condition].accuracy.push(acc);
  });
  sendJson(res, 200, {
    participant_count: participants.size,
    row_count: rows.length,
    by_condition: Object.fromEntries(Object.entries(byCondition).map(([condition, value]) => [
      condition,
      {
        rows: value.rows,
        mean_rt_ms: value.rt.length ? Math.round(value.rt.reduce((a, b) => a + b, 0) / value.rt.length) : null,
        mean_accuracy: value.accuracy.length ? value.accuracy.reduce((a, b) => a + b, 0) / value.accuracy.length : null
      }
    ]))
  });
}

function handleResultsRows(res) {
  const rows = masterRows();
  sendJson(res, 200, {
    row_count: rows.length,
    rows: rows.slice(-200)
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const resolved = path.resolve(ROOT, `.${pathname}`);

  if (!resolved.startsWith(ROOT) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  const ext = path.extname(resolved);
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/generate-text") {
      req.body = await readBody(req);
      await generateText(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/submit-results") {
      await handleSubmitResults(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/submit-demo-results") {
      await handleSubmitDemoResults(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/human-passages") {
      handleHumanPassages(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/stimulus-pool") {
      await handleStimulusPoolGet(res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/stimulus-pool") {
      await handleStimulusPoolSave(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/results") {
      handleResultsSummary(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/results-rows") {
      handleResultsRows(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/results.csv") {
      ensureDataFiles();
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"master-results.csv\"");
      fs.createReadStream(MASTER_CSV).pipe(res);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

ensureDataFiles();
server.listen(PORT, () => {
  console.log(`Experiment server running at http://127.0.0.1:${PORT}`);
  console.log(`Admin: http://127.0.0.1:${PORT}/admin.html`);
  console.log(`Master CSV: ${MASTER_CSV}`);
});
