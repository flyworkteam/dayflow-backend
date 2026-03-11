const pool = require('../config/db');
const admin = require('../config/firebase');
const { generateToken, getTrialExpiry, formatDatetime } = require('../utils/helpers');
const { AppError } = require('../utils/errors');

// POST /api/auth/register — Firebase token → create user → JWT
exports.register = async (req, res, next) => {
  try {
    const { firebase_token } = req.body;

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebase_token);
    } catch (fbErr) {
      throw new AppError('Geçersiz Firebase token.', 401);
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || req.body.email || null;
    const name = decodedToken.name || req.body.name || null;

    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id, is_deleted FROM users WHERE firebase_uid = ?',
      [firebaseUid]
    );

    if (existing.length > 0) {
      if (existing[0].is_deleted) {
        // Reactivate soft-deleted account
        await pool.execute(
          'UPDATE users SET is_deleted = 0, updated_at = NOW() WHERE id = ?',
          [existing[0].id]
        );
      }
      const token = generateToken(existing[0].id, firebaseUid);

      const [userRows] = await pool.execute(
        'SELECT id, firebase_uid, email, name, is_premium, premium_expires_at, trial_used, created_at FROM users WHERE id = ?',
        [existing[0].id]
      );

      return res.status(200).json({ token, userId: existing[0].id, isNew: false, user: userRows[0] });
    }

    // Create new user with 24h trial premium
    const trialExpiry = getTrialExpiry();
    const [result] = await pool.execute(
      `INSERT INTO users (firebase_uid, email, name, is_premium, premium_expires_at, trial_used)
       VALUES (?, ?, ?, 1, ?, 1)`,
      [firebaseUid, email || null, name || null, formatDatetime(trialExpiry)]
    );

    const userId = result.insertId;

    // Create welcome notification
    await pool.execute(
      `INSERT INTO notifications (user_id, title, body, icon_name, icon_bg_hex)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        'DayFlow\'a Hoş Geldin! 🎉',
        '24 saatlik premium deneme süren başladı. Tüm özellikleri keşfet!',
        'star_border_rounded',
        '#8FEAA5',
      ]
    );

    const token = generateToken(userId, firebaseUid);

    const [newUserRows] = await pool.execute(
      'SELECT id, firebase_uid, email, name, is_premium, premium_expires_at, trial_used, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({ token, userId, isNew: true, user: newUserRows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login — Firebase token → find/create user → JWT
exports.login = async (req, res, next) => {
  try {
    const { firebase_token } = req.body;

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebase_token);
    } catch (fbErr) {
      throw new AppError('Geçersiz Firebase token.', 401);
    }

    const firebaseUid = decodedToken.uid;

    const [rows] = await pool.execute(
      'SELECT id, is_deleted FROM users WHERE firebase_uid = ?',
      [firebaseUid]
    );

    if (rows.length === 0) {
      throw new AppError('Kullanıcı bulunamadı. Lütfen önce kayıt olun.', 404);
    }

    if (rows[0].is_deleted) {
      throw new AppError('Bu hesap silinmiş.', 410);
    }

    // Update name/email from Firebase profile if missing in DB
    const fbName = decodedToken.name || null;
    const fbEmail = decodedToken.email || null;
    if (fbName || fbEmail) {
      await pool.execute(
        'UPDATE users SET name = COALESCE(name, ?), email = COALESCE(email, ?), updated_at = NOW() WHERE id = ?',
        [fbName, fbEmail, rows[0].id]
      );
    }

    const token = generateToken(rows[0].id, firebaseUid);

    // Fetch full user for response
    const [userRows] = await pool.execute(
      'SELECT id, firebase_uid, email, name, is_premium, premium_expires_at, trial_used, created_at FROM users WHERE id = ?',
      [rows[0].id]
    );

    res.json({ token, userId: rows[0].id, user: userRows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — JWT → user profile
exports.me = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, firebase_uid, email, name, age, gender, avatar_url, language,
              is_premium, premium_expires_at, trial_used, created_at
       FROM users WHERE id = ? AND is_deleted = 0`,
      [req.userId]
    );

    if (rows.length === 0) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    const user = rows[0];
    // Check if premium has expired
    const now = new Date();
    if (user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) <= now) {
      await pool.execute(
        'UPDATE users SET is_premium = 0 WHERE id = ?',
        [req.userId]
      );
      user.is_premium = 0;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/account — Soft delete + Firebase Auth cleanup
exports.deleteAccount = async (req, res, next) => {
  try {
    // Get user's firebase_uid before soft delete
    const [userRows] = await pool.execute(
      'SELECT firebase_uid FROM users WHERE id = ? AND is_deleted = 0',
      [req.userId]
    );
    if (userRows.length === 0) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    const { firebase_uid } = userRows[0];

    // Cancel active subscriptions
    await pool.execute(
      `UPDATE subscriptions SET status = 'cancelled'
       WHERE user_id = ? AND status = 'active'`,
      [req.userId]
    );

    // Soft delete user
    await pool.execute(
      'UPDATE users SET is_deleted = 1, is_premium = 0, updated_at = NOW() WHERE id = ?',
      [req.userId]
    );

    // Delete Firebase Auth account
    if (firebase_uid) {
      try {
        await admin.auth().deleteUser(firebase_uid);
      } catch (fbErr) {
        console.error('Firebase Auth deletion failed:', fbErr.message);
      }
    }

    res.json({ message: 'Hesap başarıyla silindi.' });
  } catch (err) {
    next(err);
  }
};
