const pool = require('../config/db');
const { AppError } = require('../utils/errors');

const normalizeSlug = (text) =>
  text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// GET /api/routines?category=X
exports.getAll = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query, params;

    if (category) {
      query = `
        SELECT r.*, ur.is_active
        FROM routines r
        LEFT JOIN user_routines ur ON ur.routine_id = r.id AND ur.user_id = ?
        WHERE r.category = ?
        ORDER BY r.sort_order`;
      params = [req.userId, category];
    } else {
      query = `
        SELECT r.*, ur.is_active
        FROM routines r
        LEFT JOIN user_routines ur ON ur.routine_id = r.id AND ur.user_id = ?
        ORDER BY r.category, r.sort_order`;
      params = [req.userId];
    }

    const [rows] = await pool.execute(query, params);

    // Return flat array with is_active as boolean
    const routines = rows.map((r) => ({
      ...r,
      is_active: r.is_active ? 1 : 0,
    }));

    res.json({ routines });
  } catch (err) {
    next(err);
  }
};

// GET /api/routines/active — Get user's active routines
exports.getActive = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, ur.is_active, ur.created_at AS activated_at
       FROM routines r
       INNER JOIN user_routines ur ON ur.routine_id = r.id
       WHERE ur.user_id = ? AND ur.is_active = 1
       ORDER BY r.category, r.sort_order`,
      [req.userId]
    );
    res.json({ routines: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/routines — Create routine and activate for current user
exports.create = async (req, res, next) => {
  try {
    const { title, template_title, category, description, reminder_enabled, is_recurring, start_date, end_date } = req.body;

    // Reuse existing routine if same title+category exists in master table
    const [existingRoutineRows] = await pool.execute(
      'SELECT id FROM routines WHERE (title = ? OR template_title = ?) AND category = ? LIMIT 1',
      [title, template_title || title, category]
    );

    let routineId;
    if (existingRoutineRows.length > 0) {
      routineId = existingRoutineRows[0].id;
    } else {
      const iconName = normalizeSlug(title) || 'routine';
      const [insertRes] = await pool.execute(
        `INSERT INTO routines (category, title, template_title, icon_name, color_hex, description, reminder_enabled, is_recurring, start_date, end_date, is_premium, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 999)`,
        [
          category,
          title,
          template_title || title,
          iconName,
          '#BDB9FF',
          description ?? null,
          reminder_enabled ? 1 : 0,
          is_recurring ? 1 : 0,
          start_date ?? null,
          end_date ?? null,
        ]
      );
      routineId = insertRes.insertId;
    }

    // Ensure user_routines row is active
    const [existingUserRoutine] = await pool.execute(
      'SELECT id FROM user_routines WHERE user_id = ? AND routine_id = ? LIMIT 1',
      [req.userId, routineId]
    );

    if (existingUserRoutine.length > 0) {
      await pool.execute('UPDATE user_routines SET is_active = 1 WHERE id = ?', [existingUserRoutine[0].id]);
    } else {
      await pool.execute(
        'INSERT INTO user_routines (user_id, routine_id, is_active) VALUES (?, ?, 1)',
        [req.userId, routineId]
      );
    }

    const [rows] = await pool.execute(
      `SELECT r.*, ur.is_active
       FROM routines r
       LEFT JOIN user_routines ur ON ur.routine_id = r.id AND ur.user_id = ?
       WHERE r.id = ?`,
      [req.userId, routineId]
    );

    if (!rows[0]) throw new AppError('Rutin oluşturulamadı.', 500);
    const routine = { ...rows[0], is_active: rows[0].is_active ? 1 : 0 };
    res.status(201).json({ message: 'Rutin oluşturuldu.', routine });
  } catch (err) {
    next(err);
  }
};

// PUT /api/routines/:id — Update routine metadata
exports.update = async (req, res, next) => {
  try {
    const routineId = req.params.id;
    const { title, category, description, reminder_enabled, is_recurring, start_date, end_date } = req.body;

    const [routineCheck] = await pool.execute('SELECT id FROM routines WHERE id = ?', [routineId]);
    if (routineCheck.length === 0) throw new AppError('Rutin bulunamadı.', 404);

    await pool.execute(
      `UPDATE routines SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        reminder_enabled = COALESCE(?, reminder_enabled),
        is_recurring = COALESCE(?, is_recurring),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date)
       WHERE id = ?`,
      [
        title ?? null,
        category ?? null,
        description ?? null,
        reminder_enabled !== undefined ? (reminder_enabled ? 1 : 0) : null,
        is_recurring !== undefined ? (is_recurring ? 1 : 0) : null,
        start_date ?? null,
        end_date ?? null,
        routineId,
      ]
    );

    // Ensure user relation exists and stays active after edit
    const [existingUserRoutine] = await pool.execute(
      'SELECT id FROM user_routines WHERE user_id = ? AND routine_id = ? LIMIT 1',
      [req.userId, routineId]
    );
    if (existingUserRoutine.length === 0) {
      await pool.execute(
        'INSERT INTO user_routines (user_id, routine_id, is_active) VALUES (?, ?, 1)',
        [req.userId, routineId]
      );
    }

    const [rows] = await pool.execute(
      `SELECT r.*, ur.is_active
       FROM routines r
       LEFT JOIN user_routines ur ON ur.routine_id = r.id AND ur.user_id = ?
       WHERE r.id = ?`,
      [req.userId, routineId]
    );
    if (!rows[0]) throw new AppError('Rutin bulunamadı.', 404);

    const routine = { ...rows[0], is_active: rows[0].is_active ? 1 : 0 };
    res.json({ message: 'Rutin güncellendi.', routine });
  } catch (err) {
    next(err);
  }
};

// POST /api/routines/:id/toggle — Activate/deactivate routine for user
exports.toggle = async (req, res, next) => {
  try {
    const routineId = req.params.id;

    // Verify routine exists
    const [routineCheck] = await pool.execute('SELECT id FROM routines WHERE id = ?', [routineId]);
    if (routineCheck.length === 0) throw new AppError('Rutin bulunamadı.', 404);

    // Check current status
    const [existing] = await pool.execute(
      'SELECT id, is_active FROM user_routines WHERE user_id = ? AND routine_id = ?',
      [req.userId, routineId]
    );

    if (existing.length > 0) {
      const newVal = existing[0].is_active ? 0 : 1;
      await pool.execute('UPDATE user_routines SET is_active = ? WHERE id = ?', [newVal, existing[0].id]);
    } else {
      await pool.execute(
        'INSERT INTO user_routines (user_id, routine_id, is_active) VALUES (?, ?, 1)',
        [req.userId, routineId]
      );
    }

    // Return the full routine with updated is_active
    const [rows] = await pool.execute(
      `SELECT r.*, ur.is_active
       FROM routines r
       LEFT JOIN user_routines ur ON ur.routine_id = r.id AND ur.user_id = ?
       WHERE r.id = ?`,
      [req.userId, routineId]
    );
    if (!rows[0]) throw new AppError('Rutin bulunamadı.', 404);
    const updatedRoutine = { ...rows[0], is_active: rows[0].is_active ? 1 : 0 };

    res.json({ message: updatedRoutine.is_active ? 'Rutin aktif edildi.' : 'Rutin devre dışı bırakıldı.', routine: updatedRoutine });
  } catch (err) {
    next(err);
  }
};

// GET /api/routines/categories — Get all category names
exports.getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT category FROM routines GROUP BY category ORDER BY MIN(sort_order)',
    );
    res.json({ categories: rows.map((r) => r.category) });
  } catch (err) {
    next(err);
  }
};