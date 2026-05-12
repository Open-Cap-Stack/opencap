#!/usr/bin/env node
/**
 * postinstall.js
 *
 * Copies the bundled Claude Code skill into the user's .claude/skills/ directory
 * so that Claude Code automatically loads the OpenCap MCP usage guide on startup.
 *
 * Destination: ~/.claude/skills/opencap-mcp/SKILL.md
 *
 * Runs automatically after `npm install -g @opencapstack/mcp-server`.
 * Safe to run multiple times — always writes the latest version.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_NAME = 'opencap-mcp';
const SKILL_SRC = path.join(__dirname, '..', 'skills', SKILL_NAME, 'SKILL.md');
const SKILL_DEST_DIR = path.join(os.homedir(), '.claude', 'skills', SKILL_NAME);
const SKILL_DEST = path.join(SKILL_DEST_DIR, 'SKILL.md');

function install() {
  // Skip if skill source doesn't exist (shouldn't happen in a published package)
  if (!fs.existsSync(SKILL_SRC)) {
    return;
  }

  try {
    fs.mkdirSync(SKILL_DEST_DIR, { recursive: true });
    fs.copyFileSync(SKILL_SRC, SKILL_DEST);
    console.log(`[opencap-mcp] Claude Code skill installed → ${SKILL_DEST}`);
  } catch (err) {
    // Non-fatal — user may not have Claude Code installed, or may lack write access
    // to home directory. Silently skip rather than fail the install.
    if (process.env.OPENCAP_VERBOSE_INSTALL) {
      console.warn(`[opencap-mcp] Skill install skipped: ${err.message}`);
    }
  }
}

install();
