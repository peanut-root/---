const http = require("http");
const fs = require("fs");
const path = require("path");
const generateText = require("./api/generate-text.js");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const MASTER_CSV = path.join(DATA_DIR, "master-results.csv");
const SUBMISSIONS_JSON = path.join(DATA_DIR, "submissions.json");
const PORT = Number(process.env.PORT || 8765);

const CSV_COLUMNS = [
  "participant_number",
  "submission_id",
  "server_received_at",
  "timestamp",
  "participant_id",
  "trial_number",
  "condition",
  "response",
  "rt_ms",
  "accuracy",
  "grade",
  "native_language",
  "years_english_learning",
  "english_reading_proficiency",
  "chinese_proficiency",
  "english_reading_frequency",
  "ai_use_frequency",
  "ai_writing_familiarity",
  "text_id",
  "text_type",
  "pair_id",
  "topic",
  "reading_time_ms",
  "authorship_judgment",
  "authorship_response_key",
  "authorship_rt_ms",
  "authorship_correct",
  "ai_likelihood_rating",
  "fluency_rating",
  "structure_rating",
  "clarity_rating",
  "emotion_rating",
  "personal_voice_rating",
  "genericness_rating",
  "naturalness_rating",
  "distractor_type",
  "distractor_prompt",
  "distractor_answer",
  "distractor_response_key",
  "distractor_correct",
  "distractor_rt_ms",
  "recognition_sentence",
  "recognition_answer",
  "recognition_response_key",
  "recognition_correct",
  "recognition_rt_ms",
  "scrambled_words",
  "reconstruction_response",
  "reconstruction_correct",
  "reconstruction_rt_ms"
];

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
  if (!fs.existsSync(MASTER_CSV)) {
    fs.writeFileSync(MASTER_CSV, `${CSV_COLUMNS.join(",")}\n`);
  }
  if (!fs.existsSync(SUBMISSIONS_JSON)) {
    fs.writeFileSync(SUBMISSIONS_JSON, JSON.stringify({ nextParticipantNumber: 1, submissions: {} }, null, 2));
  }
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

async function handleSubmitResults(req, res) {
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

  const submissionId = String(payload.submission_id || `submission-${Date.now()}`);
  const registry = readJsonFile(SUBMISSIONS_JSON, { nextParticipantNumber: 1, submissions: {} });
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
      submission_id: submissionId,
      server_received_at: receivedAt
    };
    return CSV_COLUMNS.map(column => csvValue(enriched[column])).join(",");
  });

  fs.appendFileSync(MASTER_CSV, `${lines.join("\n")}\n`);
  registry.submissions[submissionId] = {
    participant_number: participantNumber,
    participant_id: rows[0]?.participant_id || "",
    row_count: rows.length,
    submitted_at: receivedAt
  };
  fs.writeFileSync(SUBMISSIONS_JSON, JSON.stringify(registry, null, 2));

  sendJson(res, 200, {
    ok: true,
    participant_number: participantNumber,
    row_count: rows.length,
    csv_path: "data/master-results.csv"
  });
}

function handleResultsSummary(res) {
  const rows = masterRows();
  const participants = new Set(rows.map(row => row.participant_number || row.participant_id).filter(Boolean));
  const byCondition = {};
  rows.forEach(row => {
    const condition = row.condition || row.text_type || "Unknown";
    if (!byCondition[condition]) byCondition[condition] = { rows: 0, rt: [], accuracy: [] };
    byCondition[condition].rows += 1;
    const rt = Number(row.rt_ms || row.authorship_rt_ms || row.recognition_rt_ms);
    const acc = Number(row.accuracy || row.authorship_correct || row.recognition_correct);
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

    if (req.method === "GET" && url.pathname === "/api/results") {
      handleResultsSummary(res);
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
