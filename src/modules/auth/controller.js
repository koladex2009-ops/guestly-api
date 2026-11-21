const User = require('../users/model');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { publicUser } = require('../users/service');

async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.validated.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ success: false, message: 'Email is already registered' });
    const user = await User.create({ firstName, lastName, email, password, role: 'guest' });
    return res.status(201).json({ success: true, message: 'Account created successfully', data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account is inactive' });
    const token = jwt.sign(
      { id: String(user._id), role: user.role, sessionVersion: user.sessionVersion ?? 0 },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token, user: publicUser(user) },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: publicUser(req.user),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: req.validated.body },
      { new: true, runValidators: true },
    );
    return res.status(200).json({ success: true, message: 'Profile updated', data: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await User.updateOne(
      { _id: req.user._id, sessionVersion: req.user.sessionVersion ?? 0 },
      { $inc: { sessionVersion: 1 } },
    );
    return res.status(200).json({ success: true, message: 'Signed out successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, getMe, updateMe, logout };
