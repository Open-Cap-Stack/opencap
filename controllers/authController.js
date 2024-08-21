const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { OAuth2Client } = require('google-auth-library'); // For Google OAuth (example)

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register a new user with username and password
exports.registerUser = async (req, res) => {
  const { username, email, password, roles } = req.body;
  try {
    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      userId: new mongoose.Types.ObjectId().toString(),
      username,
      email,
      password: hashedPassword, // Assign hashedPassword here
      UserRoles: roles,
      Permissions: 'Standard', // You can customize this
      AuthenticationMethods: 'UsernamePassword',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during user registration:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// User login with username and password
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Log the incoming request for debugging
    console.log('Login attempt:', { username, passwordProvided: !!password });

    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password field is provided and the user has a password
    if (!password || !user.password) {
      console.log('Password not provided or user has no password');
      return res.status(400).json({ message: 'Password is required' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid credentials');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user.userId, roles: user.UserRoles }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    ); // Add the semicolon here
    
    // Log successful login
    console.log('Login successful:', { userId: user.userId, roles: user.UserRoles });
    
    // Send the token as the response
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
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
    console.error('Error during OAuth login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
