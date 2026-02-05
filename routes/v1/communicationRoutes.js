const express = require('express');
const Communication = require('../../models/Communication');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// POST /api/communications - Create a new communication
router.post('/', async (req, res) => {
  try {
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content, ThreadId } = req.body;

    // Check if all required fields are present
    if (!communicationId || !MessageType || !Sender || !Recipient || !Content) {
      return res.status(400).json({ message: 'Invalid communication data: missing required fields' });
    }

    // Use ZeroDB create method instead of Mongoose constructor
    const savedCommunication = await Communication.create({
      communicationId,
      MessageType,
      Sender,
      Recipient,
      Timestamp: Timestamp || new Date().toISOString(),
      Content,
      ThreadId
    });

    res.status(201).json(savedCommunication);
  } catch (error) {
    if (error.message.includes('Validation failed')) {
      res.status(400).json({ message: 'Invalid communication data', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// POST /api/communications/thread - Create a new message in a thread
router.post('/thread', async (req, res) => {
  try {
    const { MessageType, Sender, Recipient, Content, ThreadId } = req.body;

    // Check if all required fields are present
    if (!MessageType || !Sender || !Recipient || !Content) {
      return res.status(400).json({ message: 'Invalid communication data: missing required fields' });
    }

    // Generate a unique communication ID
    const communicationId = `COM-${uuidv4().substring(0, 8)}`;

    // Create a new thread ID if not provided
    const threadId = ThreadId || `THREAD-${uuidv4().substring(0, 8)}`;

    // Use ZeroDB create method instead of Mongoose constructor
    const savedCommunication = await Communication.create({
      communicationId,
      MessageType,
      Sender,
      Recipient,
      Timestamp: new Date().toISOString(),
      Content,
      ThreadId: threadId
    });

    res.status(201).json(savedCommunication);
  } catch (error) {
    if (error.message.includes('Validation failed')) {
      res.status(400).json({ message: 'Invalid communication data', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// GET /api/communications - Get all communications
router.get('/', async (req, res) => {
  try {
    const communications = await Communication.find({});
    // Return 200 with empty array for consistent REST API behavior
    res.status(200).json({ communications: communications || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/thread/:threadId - Get all messages in a thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const messages = await Communication.findByThread(threadId);

    // Return 200 with empty array for consistent REST API behavior
    res.status(200).json({ messages: messages || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/user/:userId - Get all messages for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get messages where user is sender or recipient
    const sentMessages = await Communication.findBySender(userId);
    const receivedMessages = await Communication.findByRecipient(userId);

    // Combine and deduplicate
    const messageMap = new Map();
    [...sentMessages, ...receivedMessages].forEach(msg => {
      const id = msg._id || msg.communicationId;
      if (!messageMap.has(id)) {
        messageMap.set(id, msg);
      }
    });

    const messages = Array.from(messageMap.values());

    // Return 200 with empty array for consistent REST API behavior
    res.status(200).json({ messages: messages || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/:id - Get communication by ID
router.get('/:id', async (req, res) => {
  try {
    const communication = await Communication.findOne({ communicationId: req.params.id });
    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    res.status(200).json(communication);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/communications/:id - Update communication by ID
router.put('/:id', async (req, res) => {
  try {
    const communication = await Communication.findOneAndUpdate(
      { communicationId: req.params.id },
      req.body,
      { new: true }
    );

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.status(200).json(communication);
  } catch (error) {
    if (error.message.includes('Validation failed')) {
      res.status(400).json({ message: 'Invalid communication data', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// DELETE /api/communications/:id - Delete communication by ID
router.delete('/:id', async (req, res) => {
  try {
    const communication = await Communication.findOneAndDelete({ communicationId: req.params.id });

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.status(200).json({ message: 'Communication deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
