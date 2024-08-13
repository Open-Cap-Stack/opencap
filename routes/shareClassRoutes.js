const express = require('express');
const router = express.Router();
const ShareClass = require('../models/ShareClass');

router.get('/', async (req, res) => {
  try {
    const shareClasses = await ShareClass.find();
    res.status(200).json(shareClasses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share classes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newShareClass = new ShareClass(req.body);
    await newShareClass.save();
    res.status(201).json(newShareClass);
  } catch (error) {
    res.status(500).json({ error: 'Error creating share class' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedShareClass = await ShareClass.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json(updatedShareClass);
  } catch (error) {
    res.status(500).json({ error: 'Error updating share class' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedShareClass = await ShareClass.findByIdAndDelete(req.params.id);
    if (!deletedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ message: 'Share class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting share class' });
  }
});

module.exports = router;
