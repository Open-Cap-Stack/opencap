const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // For Google OAuth (example)

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user with username and password
exports.registerUser = async (req, res) => {
  const { username, email, password, roles } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      userId: new mongoose.Types.ObjectId().toString(),
      username,
      email,
      UserRoles: roles,
      Permissions: 'Standard', // You can customize this
      AuthenticationMethods: 'UsernamePassword',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User login with username and password
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.userId, roles: user.UserRoles }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// OAuth login (e.g., Google OAuth)
exports.oauthLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        userId: new mongoose.Types.ObjectId().toString(),
        username: name,
        email,
        UserRoles: ['Viewer'], // Default role for OAuth users
        Permissions: 'Standard',
        AuthenticationMethods: 'OAuth',
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user.userId, roles: user.UserRoles }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
