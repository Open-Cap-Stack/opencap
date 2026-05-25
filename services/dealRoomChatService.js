/**
 * Deal Room Chat Service
 * Issue #659: AI deal room / investor Q&A (RAG-based)
 *
 * Provides RAG-based Q&A over data room documents using:
 * 1. ZeroDB vector search to retrieve relevant document chunks
 * 2. ainativeChatWithRetry to answer using retrieved context
 * Returns: { answer, sources, confidence }
 */

const { ainativeChatWithRetry, parseJsonFromResponse } = require('./ainativeAgentService');
const zerodbService = require('./zerodbService');

const MAX_CONTEXT_CHUNKS = 5;
const MIN_RELEVANCE_SCORE = 0.5;

const SYSTEM_PROMPT = `You are an expert financial analyst assistant for a data room.
You answer investor questions based strictly on the provided document excerpts.
Always respond in valid JSON with this exact structure:
{ "answer": "string", "confidence": 0.0-1.0, "citations": ["documentId1", ...] }
If the documents do not contain enough information, say so honestly in the answer field.
Do not fabricate data. Confidence should reflect how well the documents support your answer.`;

/**
 * Perform RAG-based Q&A over data room documents.
 *
 * @param {Object} params
 * @param {string} params.dataRoomId - ID of the data room to search
 * @param {string} params.question   - User question
 * @param {string} params.userId     - ID of asking user (for audit)
 * @param {number} [params.topK=5]   - Number of document chunks to retrieve
 * @returns {Promise<{ answer: string, sources: Array, confidence: number }>}
 */
async function chat({ dataRoomId, question, userId, topK = MAX_CONTEXT_CHUNKS }) {
  if (!dataRoomId) throw new Error('dataRoomId is required');
  if (!question) throw new Error('question is required');

  // Step 1: Retrieve relevant document chunks from ZeroDB vector search
  // vectorSearch is an abstraction that accepts a text query + filter + limit
  let relevantChunks = [];
  try {
    const searchFn = zerodbService.vectorSearch || zerodbService.searchVectors;
    if (typeof searchFn === 'function') {
      relevantChunks = await searchFn.call(zerodbService, question, { dataRoomId }, topK);
    }
  } catch {
    // Vector search unavailable — proceed with empty context
    relevantChunks = [];
  }

  // Filter by relevance score and extract context text
  const filteredChunks = (relevantChunks || []).filter(
    chunk => (chunk.score ?? 0) >= MIN_RELEVANCE_SCORE
  );

  const contextTexts = filteredChunks.map(chunk => chunk.metadata?.text || '').filter(Boolean);
  const sources = filteredChunks.map(chunk => ({
    documentId: chunk.metadata?.documentId,
    score: chunk.score
  })).filter(s => s.documentId);

  // Step 2: Build messages with context
  const contextBlock = contextTexts.length > 0
    ? `DOCUMENT EXCERPTS:\n${contextTexts.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}`
    : 'No relevant documents found in this data room for the question.';

  const messages = [
    {
      role: 'user',
      content: `${contextBlock}\n\nQUESTION: ${question}`
    }
  ];

  // Step 3: Call LLM with context
  let rawResponse;
  try {
    rawResponse = await ainativeChatWithRetry(messages, { system: SYSTEM_PROMPT });
  } catch (err) {
    throw new Error(`LLM call failed: ${err.message}`);
  }

  // Step 4: Parse response — handle both JSON and plain text
  let parsedResponse = null;
  try {
    parsedResponse = parseJsonFromResponse(rawResponse);
  } catch {
    // LLM returned plain text instead of JSON
    parsedResponse = null;
  }

  if (!parsedResponse || typeof parsedResponse !== 'object') {
    parsedResponse = { answer: rawResponse, confidence: 0.5, citations: [] };
  }

  return {
    answer: parsedResponse.answer || rawResponse,
    confidence: typeof parsedResponse.confidence === 'number' ? parsedResponse.confidence : 0.5,
    sources,
    citations: parsedResponse.citations || [],
    dataRoomId,
    question,
    askedBy: userId,
    answeredAt: new Date().toISOString()
  };
}

module.exports = { chat };
