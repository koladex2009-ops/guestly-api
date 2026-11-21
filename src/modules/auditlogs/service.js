const AuditLog = require('./model');
const logger = require('../../config/logger');

// A logging problem must never break a payment
const record = async (entry) => {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    logger.error('Audit log failed', { action: entry && entry.action, message: err.message });
  }
};

module.exports = { record };