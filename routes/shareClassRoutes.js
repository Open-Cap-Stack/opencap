const express = require('express');
const router = express.Router();
const ShareClass = require('../models/ShareClass');

router.get('/', async (req, res) => {
  const shareClasses = await ShareClass.find();
  res.status(200).json(shareClasses);
});

router.post('/', async (req, res) => {
  const newShareClass = new ShareClass(req.body);
  await newShareClass.save();
  res.status(201).json(newShareClass);
});

module.exports = router;
