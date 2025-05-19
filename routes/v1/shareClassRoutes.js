const express = require('express');
const router = express.Router();
const ShareClass = require('../../models/ShareClass');

router.get('/api/shareClasses', async (req, res) => {
  const shareClasses = await ShareClass.find();
  res.status(200).json(shareClasses);
});

router.post('/api/shareClasses', async (req, res) => {
  const shareClass = new ShareClass(req.body);
  await shareClass.save();
  res.status(201).json(shareClass);
});

module.exports = router;
