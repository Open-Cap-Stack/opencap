'use strict';

/**
 * Data Room Gap Analysis Controller
 * Issue #615: POST /api/v1/data-rooms/:id/analyze
 *
 * Loads all documents in a data room and runs an AI gap analysis to identify
 * what is present and what is missing for a complete cap table package.
 */

const DataRoom = require('../models/DataRoom');
const Document = require('../models/Document');
const { ainativeChatWithRetry } = require('../services/ainativeAgentService');

// Categories the AI should evaluate against
const GAP_ANALYSIS_CATEGORIES = {
  formation: ['Certificate of Incorporation', 'Bylaws', 'EIN/Tax ID'],
  equity: ['Cap table', 'Option grants', 'SAFE agreements', '409A valuation'],
  compliance: ['Board minutes', 'Shareholder agreements', 'IP assignments'],
  financials: ['Bank statements', 'P&L', 'Balance sheet'],
};

const SYSTEM_PROMPT = `You are a cap table compliance analyst. Given a list of documents in a data room, perform a gap analysis against the standard categories required for a complete cap table package.

Categories and required items:
- formation: Certificate of Incorporation, Bylaws, EIN/Tax ID
- equity: Cap table, Option grants, SAFE agreements, 409A valuation
- compliance: Board minutes, Shareholder agreements, IP assignments
- financials: Bank statements, P&L, Balance sheet

Respond with valid JSON only (no markdown fences, no prose). Use this exact schema:
{
  "present": [{ "category": "...", "item": "...", "confidence": 0.0 }],
  "missing": [{ "category": "...", "item": "...", "priority": "critical|high|medium|low" }],
  "score": <0-100 integer representing completeness>,
  "summary": "<1-2 sentence summary>"
}

Rules:
- confidence is a float 0.0-1.0 indicating how closely a document matches the expected item
- priority for missing items: critical (blocks fundraising), high (investors will ask), medium (nice to have), low (optional)
- score is the percentage of required items that are present (weighted by priority)`;

/**
 * POST /api/v1/data-rooms/:id/analyze
 * Run AI gap analysis on all documents in a data room.
 */
async function analyzeDataRoom(req, res) {
  try {
    const dataRoomId = req.params.id;

    // Load the data room
    const dataRoom = await DataRoom.findByDataRoomId(dataRoomId);
    if (!dataRoom) {
      return res.status(404).json({ message: 'Data room not found' });
    }

    // Reject non-active data rooms
    if (dataRoom.status !== 'active') {
      return res.status(400).json({
        message: `Data room is not active (status: ${dataRoom.status})`,
      });
    }

    // Load all documents referenced in the data room
    const docRefs = dataRoom.documents || [];
    const loadedDocs = [];

    for (const ref of docRefs) {
      try {
        const doc = await Document.findOne({ documentId: ref.documentId });
        if (doc) {
          loadedDocs.push({
            documentId: doc.documentId,
            name: doc.name,
            category: doc.category || 'uncategorized',
            content: doc.content ? doc.content.slice(0, 2000) : '',
          });
        }
      } catch (err) {
        // Skip documents that fail to load — log and continue
        console.error(`Failed to load document ${ref.documentId}:`, err.message);
      }
    }

    // Build the user message with document inventory
    const docList = loadedDocs.length > 0
      ? loadedDocs.map((d, i) => `${i + 1}. "${d.name}" (category: ${d.category})${d.content ? `\n   Preview: ${d.content.slice(0, 200)}` : ''}`).join('\n')
      : 'No documents found in data room.';

    const userMessage = `Analyze this data room for cap table completeness.\n\nData Room: "${dataRoom.name}"\nDocuments (${loadedDocs.length}):\n${docList}`;

    // Call AI for gap analysis
    const { parsed: analysis } = await ainativeChatWithRetry(
      [{ role: 'user', content: userMessage }],
      { system: SYSTEM_PROMPT, temperature: 0.2 }
    );

    // Build and return the response
    return res.status(200).json({
      dataRoomId,
      analyzedAt: new Date().toISOString(),
      documentsAnalyzed: loadedDocs.length,
      present: analysis.present || [],
      missing: analysis.missing || [],
      score: typeof analysis.score === 'number' ? analysis.score : 0,
      summary: analysis.summary || '',
    });
  } catch (err) {
    console.error('Data room gap analysis failed:', err.message);
    return res.status(502).json({
      message: 'Gap analysis failed — AI service error',
    });
  }
}

module.exports = { analyzeDataRoom, GAP_ANALYSIS_CATEGORIES };
