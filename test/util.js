const http = require('http')
const Koa = require('koa')

module.exports = { startServer, closeServer, request }

function startServer (...middlewares) {
  const app = new Koa()
  middlewares.forEach(middleware => app.use(middleware))
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
    server.on('error', reject)
  })
}

function closeServer (server) {
  return new Promise((resolve, reject) => {
    if (!server || !server.listening) return resolve()
    server.close(error => error ? reject(error) : resolve())
  })
}

// Use Node's HTTP client so test-only dependencies cannot raise runtime requirements.
function request (server, path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body)
    if (data !== undefined) {
      headers = { ...headers, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) }
    }
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method,
      headers,
      agent: false
    }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('error', reject)
      res.on('aborted', () => reject(new Error('Test HTTP response aborted')))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString()
        try {
          const body = text && /application\/json/.test(res.headers['content-type']) ? JSON.parse(text) : text
          resolve({ status: res.statusCode, statusMessage: res.statusMessage, headers: res.headers, body })
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(1000, () => req.destroy(new Error('Test HTTP request timed out')))
    req.end(data)
  })
}
