const express = require('express');
const router = express.Router();
const ShareClass = require('../../models/ShareClass');

// GET /api/v1/share-classes - Get all share classes
router.get('/', async (req, res) => {
  try {
    const shareClasses = await ShareClass.find();
    res.status(200).json(shareClasses);
  } catch (error) {
    console.error('Error fetching share classes:', error);
    res.status(500).json({ message: 'Failed to fetch share classes', error: error.message });
  }
});

// POST /api/v1/share-classes - Create a new share class
router.post('/', async (req, res) => {
  try {
    const shareClass = await ShareClass.create(req.body);
    res.status(201).json(shareClass);
  } catch (error) {
    console.error('Error creating share class:', error);
    res.status(400).json({ message: 'Failed to create share class', error: error.message });
  }
});

// GET /api/v1/share-classes/:id - Get a specific share class
router.get('/:id', async (req, res) => {
  try {
    const shareClass = await ShareClass.findById(req.params.id);
    if (!shareClass) {
      return res.status(404).json({ message: 'Share class not found' });
    }
    res.status(200).json(shareClass);
  } catch (error) {
    console.error('Error fetching share class:', error);
    res.status(500).json({ message: 'Failed to fetch share class', error: error.message });
  }
});

// PUT /api/v1/share-classes/:id - Update a share class
router.put('/:id', async (req, res) => {
  try {
    const shareClass = await ShareClass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!shareClass) {
      return res.status(404).json({ message: 'Share class not found' });
    }
    res.status(200).json(shareClass);
  } catch (error) {
    console.error('Error updating share class:', error);
    res.status(400).json({ message: 'Failed to update share class', error: error.message });
  }
});

// DELETE /api/v1/share-classes/:id - Delete a share class
router.delete('/:id', async (req, res) => {
  try {
    const shareClass = await ShareClass.findByIdAndDelete(req.params.id);
    if (!shareClass) {
      return res.status(404).json({ message: 'Share class not found' });
    }
    res.status(200).json({ message: 'Share class deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting share class:', error);
    res.status(500).json({ message: 'Failed to delete share class', error: error.message });
  }
});

module.exports = router;
