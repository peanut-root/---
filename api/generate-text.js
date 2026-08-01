const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_SYSTEM_INSTRUCTION = [
  "You are a controlled text generator for a psycholinguistics experiment.",
  "Your job is to produce stable, concise English narrative stimuli that match a human-written reference in length, difficulty, concreteness, and style.",
  "Return valid JSON only. Do not mention AI, authorship, experiments, prompts, or generation."
].join(" ");

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function buildPrompt(config) {
  const candidates = clampNumber(config.candidates, 3, 1, 5);
  const temperature = clampNumber(config.temperature, 0.2, 0, 1);
  const targetWords = clampNumber(config.targetWords, 85, 60, 130);
  const systemInstruction = String(config.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION).trim().slice(0, 2000) || DEFAULT_SYSTEM_INSTRUCTION;

  return {
    candidates,
    temperature,
    systemInstruction,
    prompt: [
      "ROLE: You are a research assistant preparing tightly controlled psycholinguistic stimuli.",
      "",
      "TASK: Generate candidate English narrative passages for an AI-authorship perception and L2 memory experiment.",
      "",
      "STIMULUS CONFIGURATION:",
      `- Number of candidate passages: ${candidates}`,
      `- Target condition: ${config.condition || "AI-generated"}`,
      `- Genre: narrative only; do not write argumentative or expository prose.`,
      `- Topic: ${config.topic || "After Class"}`,
      `- Target length: about ${targetWords} words per passage.`,
      "- Style: simple student-readable English, CEFR B1-B2, concrete events, short sentences.",
      "- Match the human reference in length, difficulty, concreteness, and narrative point of view.",
      "- Avoid explicit references to AI, authorship, writing tools, experiments, memory tests, or generated text.",
      "- Keep vocabulary ordinary and suitable for Chinese-English bilingual university students.",
      "",
      "HUMAN REFERENCE PASSAGE:",
      config.referencePassage || "(No reference passage provided.)",
      "",
      "FEW-SHOT STYLE TARGET:",
      "A controlled narrative stimulus should describe a small everyday event, include sensory or temporal details, and avoid moralizing conclusions.",
      "",
      "OUTPUT REQUIREMENTS:",
      "Return valid JSON only. Do not include Markdown.",
      "Each candidate must include: passage, recognition_sentence, recognition_correct_answer, scrambled_words, correct_order, rationale.",
      "recognition_sentence should be one exact sentence from the passage.",
      "recognition_correct_answer should be \"yes\".",
      "scrambled_words should be words from a short sentence or phrase in scrambled order.",
      "correct_order should be the correct reconstruction text."
    ].join("\n")
  };
}

function extractOpenAiText(data) {
  return data?.choices?.[0]?.message?.content?.trim();
}

function normalizeGeneratedPayload(parsed) {
  if (Array.isArray(parsed?.candidates)) return parsed;
  if (Array.isArray(parsed?.candidate_passages)) return { ...parsed, candidates: parsed.candidate_passages };
  if (Array.isArray(parsed?.candidatePassages)) return { ...parsed, candidates: parsed.candidatePassages };
  if (Array.isArray(parsed?.passages)) return { ...parsed, candidates: parsed.passages };
  if (parsed && typeof parsed === "object" && typeof parsed.passage === "string") {
    return { candidates: [parsed] };
  }
  return parsed;
}

function resolveOpenAiEndpoint(config) {
  const rawBaseUrl = String(config.apiBaseUrl || process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim();
  let parsed;
  try {
    parsed = new URL(rawBaseUrl);
  } catch {
    throw new Error("Invalid OpenAI-compatible API base URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("OpenAI-compatible API base URL must start with http:// or https://.");
  }

  const normalized = rawBaseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Use POST." });
    return;
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    sendJson(res, 400, { error: "Invalid JSON request body." });
    return;
  }

  const model = body.model || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const built = buildPrompt(body);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      sendJson(res, 500, {
        error: "OPENAI_API_KEY is not configured on the server.",
        hint: "Set OPENAI_API_KEY in your hosting provider environment variables."
      });
      return;
    }
    const endpoint = resolveOpenAiEndpoint(body);

    const openAiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: built.temperature,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: built.systemInstruction
          },
          { role: "user", content: built.prompt }
        ]
      })
    });

    const data = await openAiResponse.json();
    if (!openAiResponse.ok) {
      sendJson(res, openAiResponse.status, {
        error: "OpenAI API request failed.",
        details: data
      });
      return;
    }

    const text = extractOpenAiText(data);
    if (!text) {
      sendJson(res, 502, { error: "OpenAI API returned no text.", details: data });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      sendJson(res, 502, { error: "OpenAI API returned non-JSON text.", raw: text });
      return;
    }

    sendJson(res, 200, {
      provider: "openai",
      model,
      api_base_url: endpoint.replace(/\/chat\/completions$/, ""),
      temperature: built.temperature,
      requested_candidates: built.candidates,
      note: "Perplexity is not exposed as a standard generation parameter here; stability is controlled with structured prompting, JSON output, and low temperature.",
      ...normalizeGeneratedPayload(parsed)
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "Server-side generation failed.",
      details: error.message
    });
  }
};
