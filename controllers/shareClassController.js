import ShareClass from '../models/ShareClass.js';

export const createShareClass = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const shareClass = new ShareClass({ name, description });
    await shareClass.save();
    res.status(201).json({ shareClass });
  } catch (error) {
    res.status(500).json({ error: 'Error creating share class' });
  }
};

export const getAllShareClasses = async (req, res) => {
  try {
    const shareClasses = await ShareClass.find();
    res.status(200).json({ shareClasses });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching share classes' });
  }
};

export const getShareClassById = async (req, res) => {
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

export const updateShareClassById = async (req, res) => {
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

export const deleteShareClassById = async (req, res) => {
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
