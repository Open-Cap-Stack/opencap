const express = require('express');
const Communication = require('../models/Communication');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// POST /api/communications - Create a new communication
router.post('/', async (req, res) => {
  try {
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content, ThreadId } = req.body;

    // Check if all required fields are present
    if (!communicationId || !MessageType || !Sender || !Recipient || !Content) {
      return res.status(400).json({ message: 'Invalid communication data: missing required fields' });
    }

    const communication = new Communication({ 
      communicationId, 
      MessageType, 
      Sender, 
      Recipient, 
      Timestamp: Timestamp || new Date(), 
      Content,
      ThreadId
    });
    const savedCommunication = await communication.save();
    res.status(201).json(savedCommunication);
  } catch (error) {
    if (error.name === 'ValidationError') {
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

    const communication = new Communication({ 
      communicationId, 
      MessageType, 
      Sender, 
      Recipient, 
      Timestamp: new Date(), 
      Content,
      ThreadId: threadId
    });
    
    const savedCommunication = await communication.save();
    res.status(201).json(savedCommunication);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Invalid communication data', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// GET /api/communications - Get all communications
router.get('/', async (req, res) => {
  try {
    const communications = await Communication.find();
    if (communications.length === 0) {
      return res.status(404).json({ message: 'No communications found' });
    }
    res.status(200).json(communications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/thread/:threadId - Get all messages in a thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const threadId = req.params.threadId;
    const messages = await Communication.find({ ThreadId: threadId })
      .sort({ Timestamp: 1 });
    
    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found in this thread' });
    }
    
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/user/:userId - Get all messages for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const messages = await Communication.find({
      $or: [
        { Sender: userId },
        { Recipient: userId }
      ]
    }).sort({ Timestamp: -1 });
    
    if (messages.length === 0) {
      return res.status(404).json({ message: 'No messages found for this user' });
    }
    
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/communications/:id - Get communication by ID
router.get('/:id', async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);
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
    const communication = await Communication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    
    res.status(200).json(communication);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Invalid communication data', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// DELETE /api/communications/:id - Delete communication by ID
router.delete('/:id', async (req, res) => {
  try {
    const communication = await Communication.findByIdAndDelete(req.params.id);
    
    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    
    res.status(200).json({ message: 'Communication deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
