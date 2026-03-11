const jwt = require('jsonwebtoken');

const generateToken = (userId, firebaseUid) => {
  return jwt.sign(
    { userId, firebaseUid },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

const getTrialExpiry = () => {
  const hours = parseInt(process.env.TRIAL_DURATION_HOURS, 10) || 24;
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Format datetime to MySQL DATETIME
const formatDatetime = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

module.exports = { generateToken, getTrialExpiry, formatDate, formatDatetime };
