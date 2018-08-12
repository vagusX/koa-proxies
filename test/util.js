const Koa = require('koa')
const jsonServer = require('json-server')

module.exports = {
  startServer,
  startMockServer
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
