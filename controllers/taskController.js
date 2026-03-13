const pool = require('../config/db');
const { AppError } = require('../utils/errors');

// GET /api/tasks?date=YYYY-MM-DD
exports.getByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    let query, params;

    if (date) {
      query = `
        SELECT t.*, GROUP_CONCAT(DATE_FORMAT(td.date, '%Y-%m-%d') ORDER BY td.date) AS dates
        FROM tasks t
        JOIN task_dates td_filter ON td_filter.task_id = t.id AND td_filter.date = ?
        LEFT JOIN task_dates td ON td.task_id = t.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC`;
      params = [date, req.userId];
    } else {
      query = `
        SELECT t.*, GROUP_CONCAT(DATE_FORMAT(td.date, '%Y-%m-%d') ORDER BY td.date) AS dates
        FROM tasks t
        LEFT JOIN task_dates td ON td.task_id = t.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC`;
      params = [req.userId];
    }

    const [rows] = await pool.execute(query, params);
    const tasks = rows.map((r) => ({
      ...r,
      dates: r.dates ? r.dates.split(',') : [],
    }));

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
exports.create = async (req, res, next) => {
  try {
    const { title, color_hex, icon_name, is_recurring, reminder_enabled, reminder_time, dates } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO tasks (user_id, title, color_hex, icon_name, is_recurring, reminder_enabled, reminder_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId,
          title,
          color_hex || '#BDB9FF',
          icon_name || 'check_circle',
          is_recurring ? 1 : 0,
          reminder_enabled !== false ? 1 : 0,
          reminder_time || null,
        ]
      );

      const taskId = result.insertId;

      // Insert task dates
      if (Array.isArray(dates) && dates.length > 0) {
        const values = dates.map((d) => [taskId, d]);
        for (const val of values) {
          await conn.execute('INSERT INTO task_dates (task_id, date) VALUES (?, ?)', val);
        }
      }

      await conn.commit();

      // Return the full task object
      const [taskRows] = await pool.execute(
        `SELECT t.*, GROUP_CONCAT(DATE_FORMAT(td.date, '%Y-%m-%d') ORDER BY td.date) AS dates
         FROM tasks t LEFT JOIN task_dates td ON td.task_id = t.id
         WHERE t.id = ? GROUP BY t.id`,
        [taskId]
      );
      const task = { ...taskRows[0], dates: taskRows[0].dates ? taskRows[0].dates.split(',') : [] };

      res.status(201).json({ message: 'Görev oluşturuldu.', task });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, color_hex, icon_name, is_recurring, reminder_enabled, reminder_time, dates } = req.body;

    // Verify ownership
    const [existing] = await pool.execute(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length === 0) throw new AppError('Görev bulunamadı.', 404);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE tasks SET
          title = COALESCE(?, title),
          color_hex = COALESCE(?, color_hex),
          icon_name = COALESCE(?, icon_name),
          is_recurring = COALESCE(?, is_recurring),
          reminder_enabled = COALESCE(?, reminder_enabled),
          reminder_time = COALESCE(?, reminder_time),
          updated_at = NOW()
         WHERE id = ?`,
        [title, color_hex, icon_name, is_recurring, reminder_enabled, reminder_time, id]
      );

      // Update dates if provided
      if (Array.isArray(dates)) {
        await conn.execute('DELETE FROM task_dates WHERE task_id = ?', [id]);
        for (const d of dates) {
          await conn.execute('INSERT INTO task_dates (task_id, date) VALUES (?, ?)', [id, d]);
        }
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    // Return the full updated task
    const [taskRows] = await pool.execute(
      `SELECT t.*, GROUP_CONCAT(DATE_FORMAT(td.date, '%Y-%m-%d') ORDER BY td.date) AS dates
       FROM tasks t LEFT JOIN task_dates td ON td.task_id = t.id
       WHERE t.id = ? GROUP BY t.id`,
      [id]
    );
    const task = { ...taskRows[0], dates: taskRows[0].dates ? taskRows[0].dates.split(',') : [] };

    res.json({ message: 'Görev güncellendi.', task });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id/toggle
exports.toggle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute(
      'SELECT id, is_completed FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length === 0) throw new AppError('Görev bulunamadı.', 404);

    const newVal = existing[0].is_completed ? 0 : 1;
    await pool.execute(
      'UPDATE tasks SET is_completed = ?, updated_at = NOW() WHERE id = ?',
      [newVal, id]
    );

    // Return the full updated task
    const [taskRows] = await pool.execute(
      `SELECT t.*, GROUP_CONCAT(DATE_FORMAT(td.date, '%Y-%m-%d') ORDER BY td.date) AS dates
       FROM tasks t LEFT JOIN task_dates td ON td.task_id = t.id
       WHERE t.id = ? GROUP BY t.id`,
      [id]
    );
    const task = { ...taskRows[0], dates: taskRows[0].dates ? taskRows[0].dates.split(',') : [] };

    res.json({ message: 'Görev durumu güncellendi.', task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Görev bulunamadı.', 404);
    res.json({ message: 'Görev silindi.' });
  } catch (err) {
    next(err);
  }
};