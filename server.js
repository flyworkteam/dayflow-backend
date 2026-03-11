require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./utils/errors');

const app = express();

// ── Middleware ─────────────────────────────────────
app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null;
app.use(
  cors(
    allowedOrigins
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error('CORS policy: origin not allowed.'));
            }
          },
        }
      : undefined,
  ),
);

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/events', require('./routes/events'));
app.use('/api/moods', require('./routes/moods'));
app.use('/api/routines', require('./routes/routines'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/premium', require('./routes/premium'));

// ── Health check ──────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// ── Error handler ─────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 DayFlow API running on port ${PORT}`);
});
