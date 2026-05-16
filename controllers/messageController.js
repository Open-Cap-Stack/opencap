/**
 * Message Controller
 *
 * Provides conversation/messaging endpoints for the frontend messages page.
 * Data is stored in ZeroDB under the 'conversations' and 'messages' tables.
 */

const zerodbService = require('../services/zerodbService');
const crypto = require('crypto');

const CONV_TABLE = 'conversations';
const MSG_TABLE = 'messages';

let tablesEnsured = false;

async function ensureTables() {
  if (tablesEnsured) return;
  try {
    await zerodbService.createTable(CONV_TABLE, {
      id: 'string', name: 'string', participants: 'json',
      participantNames: 'json', createdBy: 'string',
      createdAt: 'string', updatedAt: 'string',
    });
  } catch { /* table already exists */ }
  try {
    await zerodbService.createTable(MSG_TABLE, {
      id: 'string', conversationId: 'string', senderId: 'string',
      senderName: 'string', text: 'string', read: 'boolean',
      createdAt: 'string',
    });
  } catch { /* table already exists */ }
  tablesEnsured = true;
}

function generateUUID() {
  return crypto.randomUUID();
}

function unwrap(result) {
  const rawData = result.data || result.rows || result || [];
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item) => {
    if (item.row_data) {
      // Prefer the application-level id stored in row_data over the ZeroDB row_id
      return { ...item.row_data, id: item.row_data.id || item.row_id, row_id: item.row_id };
    }
    return item;
  });
}

/**
 * GET /api/v1/messages
 * Returns all conversations for the authenticated user, each with their messages.
 */
exports.getConversations = async (req, res) => {
  try {
    await ensureTables();
    const userId = req.user?.userId;

    // Fetch all conversations where this user is a participant
    const convResult = await zerodbService.queryTable(CONV_TABLE, {
      filter: {},
      limit: 200,
    });

    let conversations = unwrap(convResult);

    // Filter to conversations involving the current user
    if (userId) {
      conversations = conversations.filter((c) => {
        const participants = c.participants || [];
        return participants.includes(userId) || c.createdBy === userId;
      });
    }

    // Sort by most recent activity
    conversations.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    // For each conversation, fetch its messages and attach them
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const msgResult = await zerodbService.queryTable(MSG_TABLE, {
            filter: { conversationId: conv.id },
            limit: 500,
          });
          const msgs = unwrap(msgResult).sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          );

          const last = msgs[msgs.length - 1];
          const unread = msgs.filter((m) => !m.read && m.senderId !== userId).length;

          return {
            id: conv.id,
            name: conv.name || conv.participantNames?.find((n) => n !== req.user?.email) || 'Unknown',
            preview: last?.text || '',
            timestamp: last?.createdAt || conv.updatedAt || conv.createdAt,
            unread,
            messages: msgs.map((m) => ({
              id: m.id,
              from: m.senderName || m.senderId,
              text: m.text,
              ts: m.createdAt,
              sent: m.senderId === userId,
            })),
          };
        } catch {
          return {
            id: conv.id,
            name: conv.name || 'Unknown',
            preview: '',
            timestamp: conv.updatedAt || conv.createdAt,
            unread: 0,
            messages: [],
          };
        }
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('getConversations error:', error.message);
    res.json([]); // Return empty so frontend falls back to sample data gracefully
  }
};

/**
 * POST /api/v1/messages
 * Send a message. Body: { conversationId?, to?, text }
 * - If conversationId is provided, adds a message to that conversation.
 * - If `to` is provided (no conversationId), creates a new conversation first.
 */
exports.sendMessage = async (req, res) => {
  try {
    await ensureTables();
    const { conversationId, to, text } = req.body;
    const userId = req.user?.userId;
    const now = new Date().toISOString();

    if (!text?.trim()) {
      return res.status(400).json({ message: 'text is required' });
    }

    let convId = conversationId;

    // Create a new conversation if none specified
    if (!convId) {
      if (!to?.trim()) {
        return res.status(400).json({ message: 'conversationId or to is required' });
      }
      convId = generateUUID();
      const conv = {
        id: convId,
        _id: convId,
        name: to.trim(),
        participants: [userId, to.trim()],
        participantNames: [req.user?.email || userId, to.trim()],
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      await zerodbService.insertRow(CONV_TABLE, conv);
    } else {
      // Update conversation updatedAt
      await zerodbService.updateRows(CONV_TABLE, {
        filter: { id: convId },
        update: { updatedAt: now },
      }).catch(() => {});
    }

    // Insert the message
    const msgId = generateUUID();
    const message = {
      id: msgId,
      _id: msgId,
      conversationId: convId,
      senderId: userId,
      senderName: req.user?.email || userId,
      text: text.trim(),
      read: false,
      createdAt: now,
    };

    await zerodbService.insertRow(MSG_TABLE, message);

    res.status(201).json({
      id: msgId,
      from: message.senderName,
      text: message.text,
      ts: message.createdAt,
      sent: true,
      conversationId: convId,
    });
  } catch (error) {
    console.error('sendMessage error:', error.message);
    res.status(500).json({ message: error.message });
  }
};
