const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const https = require('https');

// GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, firebase_uid, email, name, age, gender, avatar_url, language,
              is_premium, premium_expires_at, trial_used, created_at
       FROM users WHERE id = ? AND is_deleted = 0`,
      [req.userId]
    );
    if (rows.length === 0) throw new AppError('Kullanıcı bulunamadı.', 404);
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, age, gender, avatar_url } = req.body;
    const safeName = name ?? null;
    const safeAge = age ?? null;
    const safeGender = gender ?? null;
    const safeAvatarUrl = avatar_url ?? null;
    await pool.execute(
      `UPDATE users SET name = COALESCE(?, name), age = COALESCE(?, age),
       gender = COALESCE(?, gender), avatar_url = COALESCE(?, avatar_url),
       updated_at = NOW() WHERE id = ?`,
      [safeName, safeAge, safeGender, safeAvatarUrl, req.userId]
    );

    // Return the updated user
    const [rows] = await pool.execute(
      `SELECT id, firebase_uid, email, name, age, gender, avatar_url, language,
              is_premium, premium_expires_at, trial_used, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    );

    res.json({ message: 'Profil güncellendi.', user: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/language
exports.updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    await pool.execute(
      'UPDATE users SET language = ?, updated_at = NOW() WHERE id = ?',
      [language, req.userId]
    );
    res.json({ message: 'Dil güncellendi.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/questionnaire
exports.saveQuestionnaire = async (req, res, next) => {
  try {
    const { answers } = req.body; // [{question_index: 0, selected_option: "..."}]
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new AppError('Cevaplar gerekli.', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const answer of answers) {
        await conn.execute(
          `INSERT INTO user_questionnaire (user_id, question_index, selected_option)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE selected_option = VALUES(selected_option)`,
          [req.userId, answer.question_index, answer.selected_option]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(201).json({ message: 'Anket cevapları kaydedildi.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/questionnaire
exports.getQuestionnaire = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT question_index, selected_option FROM user_questionnaire WHERE user_id = ? ORDER BY question_index',
      [req.userId]
    );
    res.json({ answers: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/users/avatar — upload avatar to BunnyCDN
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Resim dosyası gerekli.', 400);

    const cdnPassword = process.env.CDN_PASSWORD;
    const cdnHostname = process.env.CDN_HOSTNAME;
    const cdnUsername = process.env.CDN_USERNAME;
    if (!cdnPassword || !cdnHostname) {
      throw new AppError('CDN yapılandırması eksik.', 500);
    }

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const fileName = `avatars/${req.userId}_${Date.now()}.${ext}`;

    // Upload to BunnyCDN Storage
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'storage.bunnycdn.com',
        port: 443,
        path: `/${cdnUsername}/${fileName}`,
        method: 'PUT',
        headers: {
          'AccessKey': cdnPassword,
          'Content-Type': req.file.mimetype,
          'Content-Length': req.file.buffer.length,
        },
      };
      const uploadReq = https.request(options, (uploadRes) => {
        if (uploadRes.statusCode === 201) resolve();
        else reject(new AppError(`CDN upload failed: ${uploadRes.statusCode}`, 502));
      });
      uploadReq.on('error', reject);
      uploadReq.write(req.file.buffer);
      uploadReq.end();
    });

    const avatarUrl = `https://${cdnHostname}/${fileName}`;

    // Save URL to database
    await pool.execute(
      'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [avatarUrl, req.userId]
    );

    const [rows] = await pool.execute(
      `SELECT id, firebase_uid, email, name, age, gender, avatar_url, language,
              is_premium, premium_expires_at, trial_used, created_at
       FROM users WHERE id = ?`,
      [req.userId]
    );

    res.json({ message: 'Avatar yüklendi.', user: rows[0] });
  } catch (err) {
    next(err);
  }
};
