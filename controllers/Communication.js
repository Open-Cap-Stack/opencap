/**
 * Communication Controller
 * Issue #20: Migrate to ZeroDB via DatabaseAdapter
 */
const databaseAdapter = require('../services/databaseAdapter');
const { parsePagination } = require('../middleware/pagination');

// Create a new communication
exports.createCommunication = async (req, res) => {
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content } = req.body;

    // Check if any required field is missing
    if (!communicationId || !MessageType || !Sender || !Recipient || !Timestamp || !Content) {
        return res.status(400).json({ message: 'Invalid communication data' });
    }

    try {
        const communicationData = {
            communicationId,
            MessageType,
            Sender,
            Recipient,
            Timestamp,
            Content,
        };

        const savedCommunication = await databaseAdapter.create('Communication', communicationData);
        return res.status(201).json(savedCommunication);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get all communications
exports.getCommunications = async (req, res) => {
    try {
        const { limit, skip } = parsePagination(req.query);
        const communications = await databaseAdapter.find('Communication', {}, { limit, skip });
        if (communications.length === 0) {
            return res.status(404).json({ message: 'No communications found' });
        }
        return res.status(200).json(communications);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Get a communication by ID
exports.getCommunicationById = async (req, res) => {
    const { id } = req.params;

    try {
        const communication = await databaseAdapter.findById('Communication', id);
        if (!communication) {
            return res.status(404).json({ message: 'Communication not found' });
        }
        return res.status(200).json(communication);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Update a communication by ID
exports.updateCommunication = async (req, res) => {
    const { id } = req.params;
    const { communicationId, MessageType, Sender, Recipient, Timestamp, Content } = req.body;

    try {
        const updatedCommunication = await databaseAdapter.findByIdAndUpdate(
            'Communication',
            id,
            { communicationId, MessageType, Sender, Recipient, Timestamp, Content },
            { new: true, runValidators: true }
        );

        if (!updatedCommunication) {
            return res.status(404).json({ message: 'Communication not found' });
        }

        return res.status(200).json(updatedCommunication);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete a communication by ID
exports.deleteCommunication = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedCommunication = await databaseAdapter.findByIdAndDelete('Communication', id);
        if (!deletedCommunication) {
            return res.status(404).json({ message: 'Communication not found' });
        }
        return res.status(200).json({ message: 'Communication deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
