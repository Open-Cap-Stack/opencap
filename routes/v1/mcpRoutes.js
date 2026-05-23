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
// Proxies MCP protocol over SSE by delegating to the compiled ESM package.
// Each connection gets its own server + transport instance.
router.get('/sse', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '') ||
                  req.query.api_key;

    const path = require('path');
    const distDir = path.resolve(__dirname, '../../packages/opencap-mcp/dist');

    let createServer, createClient, SSEServerTransport;
    try {
      const serverMod = await import(`file://${distDir}/server.js`);
      const clientMod = await import(`file://${distDir}/client.js`);
      const sdkMod    = await import('@modelcontextprotocol/sdk/server/sse.js');
      createServer = serverMod.createServer;
      createClient = clientMod.createClient;
      SSEServerTransport = sdkMod.SSEServerTransport;
    } catch (e) {
      return res.status(503).json({
        error: 'MCP server package not available',
        message: e.message,
        alternative: 'Use npx @opencapstack/mcp-server for local stdio mode',
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    process.env.OPENCAP_API_KEY = token;
    const client = createClient(token);
    const server = createServer(client);
    const transport = new SSEServerTransport('/api/v1/mcp/messages', res);
    await server.connect(transport);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP server error', message: err.message });
    }
  }
});

// POST endpoint for MCP messages (SSE session continuation)
router.post('/messages', async (req, res) => {
  res.status(400).json({ error: 'Session routing not supported in stateless mode. Reconnect via /sse.' });
});

module.exports = router;
