const User = require('../models/User');

exports.createUser = async (req, res) => {
  const { userId, name, email, password, role } = req.body;

  if (!userId || !name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = new User({ userId, name, email, password, role });
    await user.save();
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
};
