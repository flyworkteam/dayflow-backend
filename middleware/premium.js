const pool = require('../config/db');

// Check if user has active premium or within trial period
const requirePremium = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT is_premium, premium_expires_at FROM users WHERE id = ? AND is_deleted = 0',
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const user = rows[0];
    const now = new Date();
    const isPremiumActive =
      user.is_premium === 1 &&
      user.premium_expires_at &&
      new Date(user.premium_expires_at) > now;

    if (!isPremiumActive) {
      return res.status(403).json({
        error: 'Bu özellik premium üyelik gerektirir.',
        code: 'PREMIUM_REQUIRED',
      });
    }

    req.isPremium = true;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requirePremium;
