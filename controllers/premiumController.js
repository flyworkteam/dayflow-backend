const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const { formatDatetime } = require('../utils/helpers');

// GET /api/premium/status
exports.getStatus = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT is_premium, premium_expires_at, trial_used FROM users WHERE id = ? AND is_deleted = 0`,
      [req.userId]
    );

    if (rows.length === 0) throw new AppError('Kullanıcı bulunamadı.', 404);

    const user = rows[0];
    const now = new Date();
    const isActive = user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > now;

    // Auto-expire if needed
    if (user.is_premium && !isActive) {
      await pool.execute('UPDATE users SET is_premium = 0 WHERE id = ?', [req.userId]);
    }

    // Get active subscription if any
    const [subs] = await pool.execute(
      `SELECT plan_type, price, currency, status, starts_at, expires_at
       FROM subscriptions WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );

    res.json({
      is_premium: !!isActive,
      premium_expires_at: user.premium_expires_at,
      trial_used: !!user.trial_used,
      subscription: subs.length > 0 ? subs[0] : null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/premium/verify — RevenueCat webhook / receipt verification
exports.verify = async (req, res, next) => {
  try {
    const { plan_type, rc_subscription_id, expires_at } = req.body;

    if (!plan_type || !expires_at) {
      throw new AppError('Plan bilgileri gerekli.', 400);
    }

    const pricing = { monthly: 49.99, yearly: 299.99 };
    const price = pricing[plan_type] || 49.99;
    const now = new Date();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Create subscription record
      await conn.execute(
        `INSERT INTO subscriptions (user_id, plan_type, price, currency, rc_subscription_id, status, starts_at, expires_at)
         VALUES (?, ?, ?, 'TRY', ?, 'active', ?, ?)`,
        [req.userId, plan_type, price, rc_subscription_id || null, formatDatetime(now), expires_at]
      );

      // Update user premium status
      await conn.execute(
        'UPDATE users SET is_premium = 1, premium_expires_at = ?, updated_at = NOW() WHERE id = ?',
        [expires_at, req.userId]
      );

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(201).json({ message: 'Premium abonelik aktif edildi.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/premium/webhook — RevenueCat server-to-server webhook
exports.webhook = async (req, res, next) => {
  try {
    // Verify webhook authorization
    const authHeader = req.headers['authorization'];
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return res.status(401).json({ error: 'Unauthorized webhook request.' });
    }

    const { event } = req.body;
    if (!event) return res.status(200).json({ ok: true });

    const { type, app_user_id, expiration_at_ms } = event;

    // Find user by firebase_uid (app_user_id from RevenueCat)
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE firebase_uid = ?',
      [app_user_id]
    );

    if (users.length === 0) return res.status(200).json({ ok: true });

    const userId = users[0].id;

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE': {
        const expiresAt = expiration_at_ms
          ? formatDatetime(new Date(expiration_at_ms))
          : null;
        await pool.execute(
          'UPDATE users SET is_premium = 1, premium_expires_at = ? WHERE id = ?',
          [expiresAt, userId]
        );
        break;
      }
      case 'CANCELLATION':
      case 'EXPIRATION': {
        await pool.execute(
          'UPDATE users SET is_premium = 0 WHERE id = ?',
          [userId]
        );
        // Update subscription status
        await pool.execute(
          `UPDATE subscriptions SET status = 'expired'
           WHERE user_id = ? AND status = 'active'`,
          [userId]
        );
        break;
      }
      case 'BILLING_ISSUE': {
        await pool.execute(
          `UPDATE subscriptions SET status = 'billing_issue'
           WHERE user_id = ? AND status = 'active'`,
          [userId]
        );
        break;
      }
      case 'TRANSFER':
      case 'SUBSCRIBER_ALIAS': {
        // Transfer: app_user_id already resolved above
        // Log for audit; no premium status change needed
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `RevenueCat ${type} event for user ${userId}`,
        }));
        break;
      }
      case 'NON_RENEWING_PURCHASE': {
        const expiresAt = expiration_at_ms
          ? formatDatetime(new Date(expiration_at_ms))
          : null;
        await pool.execute(
          'UPDATE users SET is_premium = 1, premium_expires_at = ? WHERE id = ?',
          [expiresAt, userId]
        );
        break;
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
};
