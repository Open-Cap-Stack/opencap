/**
 * MCP Server Routes — Issue #495
 *
 * Hosts the SSE transport for the @opencapstack/mcp-server at /api/v1/mcp/sse.
 * The MCP package handles tool dispatch; this route just wires the transport.
 *
 * Usage: Set OPENCAP_API_KEY in env and connect any MCP client to:
 *   https://api.opencapstack.com/api/v1/mcp/sse
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Lightweight JWT-only auth — no DB lookup, for low-latency MCP handshake
function requireJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.query.api_key;

  if (!token) {
    return res.status(401).json({ error: 'Missing API key', message: 'Provide Authorization: Bearer <token> header or ?api_key= query param' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server misconfigured', message: 'JWT_SECRET not set' });
  }

  try {
    req.mcpUser = jwt.verify(token, secret);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token', message: e.message });
  }

  next();
}

router.use(requireJwt);

// Health / discovery endpoint — returns server metadata for MCP clients
router.get('/', (req, res) => {
  res.json({
    name: 'opencap-mcp',
    version: '0.1.0',
    description: 'OpenCap Stack MCP Server — cap table management via AI chat',
    transports: ['sse', 'stdio'],
    sseEndpoint: '/api/v1/mcp/sse',
    docs: 'https://github.com/Open-Cap-Stack/opencapstack/tree/main/packages/opencap-mcp',
    npmPackage: '@opencapstack/mcp-server',
  });
});

// SSE transport endpoint
// The MCP SDK SSE transport handles the actual HTTP/SSE handshake.
// We dynamically import the compiled MCP package if available; otherwise
// return a 503 so the rest of the API stays healthy during rollout.
router.get('/sse', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '') ||
                  req.query.api_key;

    // SSE transport is handled by the MCP server package
    // When the package is built and available this will be loaded dynamically
    const mcpPackagePath = '../../packages/opencap-mcp/dist/index.js';
    let mcpAvailable = false;
    try {
      require.resolve(mcpPackagePath);
      mcpAvailable = true;
    } catch (_) {
      mcpAvailable = false;
    }

    if (!mcpAvailable) {
      return res.status(503).json({
        error: 'MCP server package not built',
        message: 'Run: cd packages/opencap-mcp && npm run build',
        alternative: 'Use npx @opencapstack/mcp-server for local stdio mode',
      });
    }

    // Set SSE headers and hand off to MCP transport
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    process.env.OPENCAP_API_KEY = token;
    process.env.TRANSPORT = 'sse';
    require(mcpPackagePath);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP server error', message: err.message });
    }
  }
});

module.exports = router;
