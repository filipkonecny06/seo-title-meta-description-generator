const notFoundHandler = (req, res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  if (err.code === 'EBADCSRFTOKEN') {
    if (req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Invalid CSRF token. Refresh and try again.' });
    }
    return res.status(403).render('error', {
      title: 'Security Token Error',
      status: 403,
      message: 'Your form session expired. Refresh the page and submit again.',
    });
  }

  if (req.path.startsWith('/api')) {
    return res.status(status).json({
      error: status >= 500 ? 'Internal server error' : err.message,
    });
  }

  return res.status(status).render('error', {
    title: 'Something Went Wrong',
    status,
    message: status >= 500 ? 'Unexpected server error.' : err.message,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
