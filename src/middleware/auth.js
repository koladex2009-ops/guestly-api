const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../modules/users/model');

const auth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const token = authorization.slice(7).trim();
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid authentication token' });
    }
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || (user.sessionVersion ?? 0) !== (decoded.sessionVersion ?? 0)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    return next(error);
  }
};

module.exports = auth;
