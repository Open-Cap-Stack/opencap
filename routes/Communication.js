const express = require('express');
const Communication = require('../models/Communication');
const router = express.Router();

// POST /api/communications - Create a new communication
router.post('/', async (req, res) => {
  try {
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content, threadId } = req.body;

    // Check if all required fields are present
    if (!communicationId || !MessageType || !Sender || !Recipient || !Timestamp || !Content) {
      return res.status(400).json({ message: 'Invalid communication data' });
    }

    const communication = new Communication({ 
      communicationId, 
      MessageType, 
      Sender, 
      Recipient, 
      Timestamp, 
      Content,
      threadId: threadId || null 
    });
    
    const savedCommunication = await communication.save();
    res.status(201).json(savedCommunication);
  } catch (error) {
    res.status(400).json({ message: 'Invalid communication data', error: error.message });
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
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/communications/:id - Update communication by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedCommunication = await Communication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCommunication) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    res.status(200).json(updatedCommunication);
  } catch (error) {
    res.status(400).json({ message: 'Invalid communication data' });
  }
});

// DELETE /api/communications/:id - Delete communication by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedCommunication = await Communication.findByIdAndDelete(req.params.id);
    if (!deletedCommunication) {
      return res.status(404).json({ message: 'Communication not found' });
    }
    res.status(200).json({ message: 'Communication deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communications/threads/:threadId - Get communications by thread ID
router.get('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const threadCommunications = await Communication.find({ threadId })
      .sort({ Timestamp: 1 })
      .populate('Sender', 'name email')
      .populate('Recipient', 'name email');
    
    if (threadCommunications.length === 0) {
      return res.status(404).json({ message: 'No communications found in this thread' });
    }
    
    res.status(200).json(threadCommunications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/communications/threads - Create a new thread with initial message
router.post('/threads', async (req, res) => {
  try {
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content, threadId } = req.body;
    
    // Generate a threadId if not provided
    const newThreadId = threadId || `thread-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Check if all required fields are present
    if (!communicationId || !MessageType || !Sender || !Recipient || !Timestamp || !Content) {
      return res.status(400).json({ message: 'Invalid communication data' });
    }
    
    const communication = new Communication({
      communicationId,
      MessageType,
      Sender,
      Recipient,
      Timestamp,
      Content,
      threadId: newThreadId
    });
    
    const savedCommunication = await communication.save();
    res.status(201).json({
      message: 'Thread created successfully',
      threadId: newThreadId,
      communication: savedCommunication
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid thread data', error: error.message });
  }
});

module.exports = router;
