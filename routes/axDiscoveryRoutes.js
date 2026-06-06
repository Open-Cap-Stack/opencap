/**
 * AX (Agent Experience) discovery routes
 * Serves machine-readable files for AI agent discovery at well-known paths.
 * These routes bypass auth — they are public by design.
 */
const express = require('express');
const path = require('path');
const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '../public');

const sendFile = (filename, contentType) => (req, res) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(PUBLIC_DIR, filename), (err) => {
    if (err) res.status(404).json({ error: { code: 'NOT_FOUND', message: `${filename} not found`, status: 404 } });
  });
};

// Core discovery files
router.get('/robots.txt', sendFile('robots.txt', 'text/plain; charset=utf-8'));
router.get('/sitemap.xml', sendFile('sitemap.xml', 'application/xml; charset=utf-8'));
router.get('/llms.txt', sendFile('llms.txt', 'text/plain; charset=utf-8'));
router.get('/llms-full.txt', sendFile('llms-full.txt', 'text/plain; charset=utf-8'));
router.get('/AGENTS.md', sendFile('AGENTS.md', 'text/markdown; charset=utf-8'));
router.get('/agent.json', sendFile('agent.json', 'application/json'));
router.get('/agent-card.json', sendFile('agent-card.json', 'application/json'));
router.get('/mcp-server-card.json', sendFile('mcp-server-card.json', 'application/json'));
router.get('/agent-manifest.txt', sendFile('agent-manifest.txt', 'text/plain; charset=utf-8'));
router.get('/sdks.txt', sendFile('sdks.txt', 'text/plain; charset=utf-8'));
router.get('/openapi.json', sendFile('openapi.json', 'application/json'));

// Logo for plugin store
router.get('/logo.png', sendFile('logo.png', 'image/png'));

// Root route — API identity for api.opencapstack.com
router.get('/', (req, res) => {
  res.json({
    name: 'OpenCap Stack API',
    version: '1.0.0',
    docs: 'https://opencapstack.com/developers',
    openapi: 'https://opencapstack.com/openapi.json',
    health: '/api/v1/health'
  });
});

// .well-known paths
router.get('/.well-known/security.txt', sendFile('.well-known/security.txt', 'text/plain; charset=utf-8'));
router.get('/.well-known/ai-plugin.json', sendFile('.well-known/ai-plugin.json', 'application/json'));
router.get('/.well-known/agent.json', sendFile('.well-known/agent.json', 'application/json'));
router.get('/.well-known/mcp-servers.json', sendFile('.well-known/mcp-servers.json', 'application/json'));
router.get('/.well-known/openapi.json', sendFile('openapi.json', 'application/json'));

module.exports = router;
