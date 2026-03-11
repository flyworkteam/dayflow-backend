class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, _next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: err.isOperational ? 'warn' : 'error',
    message: err.message,
    statusCode: err.statusCode || 500,
    method: req.method,
    path: req.originalUrl,
    ...(err.stack && !err.isOperational && { stack: err.stack }),
  };
  console.error(JSON.stringify(logEntry));

  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Unexpected errors
  res.status(500).json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' });
};

module.exports = { AppError, errorHandler };
