/**
 * NLWeb-style conversational search endpoint.
 * Public by design — answers questions about the product itself (not
 * company-private data; private cap-table search already exists behind
 * auth at /api/v1/documents/search and is a different thing entirely).
 *
 * Real retrieval, not a canned response: splits llms-full.txt into its
 * real ## sections, scores each by keyword overlap with the query, and
 * returns the best-matching section(s) as the answer. No LLM call — this
 * is a lightweight NLWeb implementation per the nlweb.ai spec, which
 * explicitly allows retrieval-only responses.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createEndpointRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const CONTEXT_FILE = path.join(__dirname, '../client/public/llms-full.txt');

// Splits on ## AND ### headings, not just ##. A query like "what is a SAFE
// note" needs to retrieve the ### SAFENote subsection directly — if only
// the parent ## section (e.g. "Core Data Model", which also contains
// Stakeholder, ShareClass, EquityGrant, etc.) were indexed, a short
// specific question would get buried under unrelated sibling content.
function parseSections(raw) {
  const lines = raw.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^#{2,3}\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({
    heading: s.heading,
    text: s.body.join('\n').trim(),
  }));
}

// Splits on non-alphanumeric boundaries AND on camelCase/PascalCase
// boundaries, so a heading like "SAFENote" tokenizes to ["safe", "note"]
// and actually matches a query asking about "SAFE notes" — verified this
// was needed: without it, "what is a SAFE note" scored the unrelated
// "Complete API Reference" section higher than the real SAFENote entity,
// because "safenote" as a single token never matched "safe" or "note".
function tokenize(text) {
  const spaced = text
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // acronym boundary: SAFENote -> SAFE Note
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');    // camelCase boundary: shareClass -> share Class
  return (spaced.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2);
}

function scoreSection(queryTokens, section) {
  const sectionTokens = new Set(tokenize(section.heading + ' ' + section.text));
  let matches = 0;
  for (const t of queryTokens) {
    if (sectionTokens.has(t)) matches += 1;
  }
  // Heading matches count double — a question about "SAFE notes" should
  // strongly prefer the section literally titled SAFE Note over one that
  // merely mentions "safe" in passing.
  const headingTokens = new Set(tokenize(section.heading));
  for (const t of queryTokens) {
    if (headingTokens.has(t)) matches += 1;
  }
  return matches;
}

let cachedSections = null;
function getSections() {
  if (cachedSections) return cachedSections;
  try {
    const raw = fs.readFileSync(CONTEXT_FILE, 'utf-8');
    cachedSections = parseSections(raw);
  } catch {
    cachedSections = [];
  }
  return cachedSections;
}

router.get(
  '/ask',
  createEndpointRateLimiter('/ask', { maxRequests: 60, windowMs: 15 * 60 * 1000 }),
  (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!query) {
      return res.status(400).json({
        error: { code: 'MISSING_QUERY', message: 'Provide a question via ?q=', status: 400 },
        docs: 'https://opencapstack.com/AGENTS.md',
      });
    }

    const sections = getSections();
    const queryTokens = tokenize(query);
    const scored = sections
      .map((s) => ({ ...s, score: scoreSection(queryTokens, s) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return res.status(200).json({
        query,
        answer: null,
        message: "No matching section found in OpenCap Stack's documentation. See /llms-full.txt for the full context, or /AGENTS.md for the agent integration guide.",
        sources: [],
      });
    }

    return res.status(200).json({
      query,
      answer: scored[0].text,
      sources: scored.map((s) => ({ heading: s.heading, relevance: s.score })),
      full_context: 'https://opencapstack.com/llms-full.txt',
    });
  }
);

module.exports = router;
