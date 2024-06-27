const ShareClass = require('../models/ShareClass');

exports.createShareClass = async (req, res) => {
  const { shareClassId, name, authorizedShares, dilutedShares, ownershipPercentage, amountRaised } = req.body;

  if (!shareClassId || !name || !authorizedShares || !dilutedShares || !ownershipPercentage || !amountRaised) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const shareClass = new ShareClass({ shareClassId, name, authorizedShares, dilutedShares, ownershipPercentage, amountRaised });
    await shareClass.save();
    res.status(201).json({ shareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error creating share class' });
  }
};

exports.getAllShareClasses = async (req, res) => {
  try {
    const shareClasses = await ShareClass.find();
    res.status(200).json({ shareClasses });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share classes' });
  }
};

exports.getShareClassById = async (req, res) => {
  try {
    const shareClass = await ShareClass.findById(req.params.id);
    if (!shareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ shareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share class' });
  }
};

exports.updateShareClassById = async (req, res) => {
  try {
    const updatedShareClass = await ShareClass.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ shareClass: updatedShareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error updating share class' });
  }
};

exports.deleteShareClassById = async (req, res) => {
  try {
    const deletedShareClass = await ShareClass.findByIdAndDelete(req.params.id);
    if (!deletedShareClass) {
      return res.status(404).json({ error: 'Share class not found' });
    }
    res.status(200).json({ message: 'Share class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting share class' });
  }
};
