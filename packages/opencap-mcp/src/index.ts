#!/usr/bin/env node
/**
 * OpenCap MCP Server entry point.
 *
 * Supports two transport modes:
 *   TRANSPORT=stdio  (default) — for Claude Desktop / Claude Code
 *   TRANSPORT=sse             — HTTP + SSE, useful for web-based clients
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './server.js';
import { getApiKey } from './auth.js';
import { createClient } from './client.js';

async function main() {
  // Fail fast if the API key is missing
  const apiKey = getApiKey();
  const client = createClient(apiKey);
  const server = createServer(client);

  const transport = process.env.TRANSPORT ?? 'stdio';

  if (transport === 'sse') {
    // Dynamically import express so it doesn't slow down the stdio path
    const { default: express } = await import('express');
    const app = express();
    const port = Number(process.env.PORT ?? 3001);

    // Map to hold active SSE transports keyed by session
    const transports = new Map<string, SSEServerTransport>();

    app.get('/sse', async (req, res) => {
      const sseTransport = new SSEServerTransport('/messages', res);
      transports.set(sseTransport.sessionId, sseTransport);

      res.on('close', () => {
        transports.delete(sseTransport.sessionId);
      });

      await server.connect(sseTransport);
    });

    app.post('/messages', express.json(), async (req, res) => {
      const sessionId = req.query['sessionId'] as string;
      const sseTransport = transports.get(sessionId);

      if (!sseTransport) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await sseTransport.handlePostMessage(req, res);
    });

    app.listen(port, () => {
      console.error(`OpenCap MCP server listening on http://localhost:${port}`);
    });
  } else {
    // stdio transport (default)
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    console.error('OpenCap MCP server running on stdio');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
