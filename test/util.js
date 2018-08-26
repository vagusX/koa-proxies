const Koa = require('koa')
const jsonServer = require('json-server')
const http = require('http')

module.exports = {
  startServer,
  startMockServer,
  sleep,
  timeoutServer,
}

function startServer(port, ...middlewares) {
  const app = new Koa()
  middlewares.forEach(middleware => {
    app.use(middleware)
  })
  return app.listen(port)
}

function startMockServer(port, dbObject) {
  const server = jsonServer.create()

  server.use(jsonServer.defaults())
  server.use(jsonServer.router(dbObject))
  return server.listen(port)
}

function timeoutServer(timeout, port) {
  http.createServer(function (_, res) {
    setTimeout((function() {
      res.writeHead(200, {'Content-Type': 'text/plain'})
      res.end('Hello I am awake')
    }), timeout)
  }).listen(port)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
