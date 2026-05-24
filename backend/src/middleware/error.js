export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(err, _req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production'
  const status = err.status || 500
  const body = { error: err.publicMessage || err.message || 'Server error' }
  if (!isProd) body.stack = err.stack
  if (status >= 500) console.error('[error]', err)
  res.status(status).json(body)
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}
