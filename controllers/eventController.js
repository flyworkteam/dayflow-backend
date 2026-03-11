const pool = require('../config/db');
const { AppError } = require('../utils/errors');

// GET /api/events?month=M&year=Y
exports.getByMonth = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    let query, params;
    if (month && year) {
      query = `
        SELECT * FROM events
        WHERE user_id = ?
          AND (
            (MONTH(start_date) = ? AND YEAR(start_date) = ?)
            OR (end_date IS NOT NULL AND MONTH(end_date) = ? AND YEAR(end_date) = ?)
          )
        ORDER BY start_date ASC`;
      params = [req.userId, month, year, month, year];
    } else {
      query = 'SELECT * FROM events WHERE user_id = ? ORDER BY start_date DESC LIMIT 50';
      params = [req.userId];
    }

    const [rows] = await pool.execute(query, params);
    res.json({ events: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (rows.length === 0) throw new AppError('Etkinlik bulunamadı.', 404);
    res.json({ event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/events
exports.create = async (req, res, next) => {
  try {
    const { title, description, start_date, end_date, start_time, end_time, color, repeat_type, is_all_day } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO events (user_id, title, description, start_date, end_date, start_time, end_time, color_hex, repeat_type, is_all_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, title, description || null, start_date, end_date || null, start_time || null, end_time || null, color || '#BDB9FF', repeat_type || 'none', is_all_day ? 1 : 0]
    );

    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'Etkinlik oluşturuldu.', event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, start_time, end_time, color, repeat_type, is_all_day } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM events WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length === 0) throw new AppError('Etkinlik bulunamadı.', 404);

    await pool.execute(
      `UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        color_hex = COALESCE(?, color_hex),
        repeat_type = COALESCE(?, repeat_type),
        is_all_day = COALESCE(?, is_all_day),
        updated_at = NOW()
       WHERE id = ?`,
      [title, description, start_date, end_date, start_time, end_time, color, repeat_type, is_all_day, id]
    );

    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
    res.json({ message: 'Etkinlik güncellendi.', event: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'DELETE FROM events WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Etkinlik bulunamadı.', 404);
    res.json({ message: 'Etkinlik silindi.' });
  } catch (err) {
    next(err);
  }
};
