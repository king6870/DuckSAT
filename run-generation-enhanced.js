// run-generation-enhanced.js
// Enhanced admin batch generation script for DuckSAT
// Usage: set env vars and run with `node run-generation-enhanced.js`
// Config via environment variables:
// BASE_URL (default http://localhost:3000)
// ADMIN_API_KEY (optional) -> sent as Authorization: Bearer <token>
// GENERATION_ENDPOINT (default /api/admin/enhanced-generate-questions)
// ITERATIONS (default 10) - how many times to call the endpoint
// QUESTIONS_PER_CALL (default 10) - forwarded in request body as questionCount
// INTERVAL_MS (default 15000) - base wait between iterations
// RETRIES (default 3) - per-call retry attempts
// TIMEOUT_MS (default 30000) - per-call timeout
// OUTPUT_FILE (default generation-results.json)

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GENERATION_ENDPOINT = process.env.GENERATION_ENDPOINT || '/api/admin/enhanced-generate-questions';
const ITERATIONS = parseInt(process.env.ITERATIONS || '10', 10);
const QUESTIONS_PER_CALL = parseInt(process.env.QUESTIONS_PER_CALL || '10', 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '15000', 10);
const RETRIES = parseInt(process.env.RETRIES || '3', 10);
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '30000', 10);
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'generation-results.json';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

if (typeof fetch === 'undefined') {
  // Node < 18 fallback
  global.fetch = require('node-fetch');
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function randJitter(base) {
  return Math.floor(base * (0.5 + Math.random())); // simple jitter
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const merged = { ...opts, signal: controller.signal };
    const res = await fetch(url, merged);
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function postGenerate(body, attempt = 1) {
  const url = `${BASE_URL.replace(/\/$/, '')}${GENERATION_ENDPOINT}`;
  const headers = { 'Content-Type': 'application/json' };
  if (ADMIN_API_KEY) headers['Authorization'] = `Bearer ${ADMIN_API_KEY}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, TIMEOUT_MS);

    const text = await res.text();
    // Try to parse JSON, fall back to raw text
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { parsed = { raw: text }; }

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      err.response = parsed;
      throw err;
    }
    return parsed;
  } catch (err) {
    if (attempt <= RETRIES) {
      const backoff = Math.min(60000, 1000 * Math.pow(2, attempt) + randJitter(500));
      console.warn(`Attempt ${attempt} failed: ${err.message || err}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return postGenerate(body, attempt + 1);
    }
    throw err;
  }
}

async function run() {
  console.log('🚀 Starting enhanced generation run');
  const summary = {
    iterations: ITERATIONS,
    results: [],
    generated_total: 0,
    accepted_total: 0,
    failed: 0,
  };

  // Optional health check
  try {
    const healthUrl = `${BASE_URL.replace(/\/$/, '')}/api/admin/questions`;
    const healthRes = await fetchWithTimeout(healthUrl, { method: 'GET' }, 5000);
    if (!healthRes.ok) {
      console.warn(`⚠️ Health check warning: ${healthRes.status} ${healthRes.statusText}`);
    } else {
      console.log('✅ Server health check passed');
    }
  } catch (err) {
    console.warn('⚠️ Server health check failed:', err.message || err);
  }

  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`\n🔁 Iteration ${i}/${ITERATIONS}`);
    const body = {
      llmModel: process.env.LLM_MODEL || 'gpt-5',
      questionCount: QUESTIONS_PER_CALL,
      mathCount: Math.floor(QUESTIONS_PER_CALL / 2),
      readingCount: Math.ceil(QUESTIONS_PER_CALL / 2),
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '4000', 10),
      includeCharts: process.env.INCLUDE_CHARTS === 'true',
      includePassages: process.env.INCLUDE_PASSAGES !== 'false',
    };

    try {
      const res = await postGenerate(body, 1);
      const generated = res.summary?.generated ?? res.generated ?? 0;
      const accepted = res.summary?.accepted ?? res.accepted ?? 0;
      summary.results.push({ iteration: i, ok: true, generated, accepted, raw: res });
      summary.generated_total += generated;
      summary.accepted_total += accepted;
      console.log(`✅ Iteration ${i} result - generated: ${generated}, accepted: ${accepted}`);
    } catch (err) {
      summary.results.push({ iteration: i, ok: false, error: `${err.message || err}`, status: err.status || null, response: err.response || null });
      summary.failed += 1;
      console.error(`❌ Iteration ${i} failed: ${err.message || err}`);
    }

    if (i < ITERATIONS) {
      const wait = randJitter(INTERVAL_MS);
      console.log(`⏳ Waiting ${wait} ms before next iteration...`);
      await sleep(wait);
    }
  }

  // Persist results
  try {
    fs.writeFileSync(path.resolve(OUTPUT_FILE), JSON.stringify(summary, null, 2));
    console.log(`📁 Results written to ${OUTPUT_FILE}`);
  } catch (err) {
    console.warn('⚠️ Failed to write results file:', err.message || err);
  }

  console.log(`\n🎉 Completed. Generated total: ${summary.generated_total}, Accepted total: ${summary.accepted_total}, Failed iterations: ${summary.failed}`);
  if (summary.failed > 0) process.exitCode = 2;
  return summary;
}

run().catch((e) => {
  console.error('Fatal error running generation script:', e);
  process.exit(1);
});
