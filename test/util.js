const Koa = require('koa')

module.exports = {
  startServer,
  sleep
}

function startServer (port, ...middlewares) {
  const app = new Koa()
  middlewares.forEach(middleware => {
    app.use(middleware)
  })
  return app.listen(port)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
