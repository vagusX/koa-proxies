/**
 * Dependencies
 */

const HttpProxy = require('http-proxy')
const pathMatch = require('path-match')

/**
 * Constants
 */

const proxy = HttpProxy.createProxyServer()
const route = pathMatch({
  // path-to-regexp options
  sensitive: false,
  strict: false,
  end: false
})

/**
 * Koa Http Proxy Middleware
 */
module.exports = (context, options) => (ctx, next) => {
  // create a match function
  const match = route(context)
  if (!match(ctx.req.url)) return next()

  let opts = options
  if (typeof options === 'function') {
    const params = match(ctx.req.url)
    opts = options.call(options, params)
  }

  const { logs, rewrite, events } = opts

  return new Promise((resolve, reject) => {
    ctx.req.oldPath = ctx.req.url

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url)
    }

    if (logs) logger(ctx)

    if (events && typeof events === 'object') {
      Object.entries(events).forEach(([event, handler]) => {
        proxy.on(event, handler)
      })
    }

    ['logs', 'rewrite', 'events'].forEach(n => {
      delete opts[n]
    })

    proxy.web(ctx.req, ctx.res, opts, e => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504
      }[e.code]
      if (status) ctx.status = status
      resolve()
    })
  })
}

function logger (ctx) {
  console.log('%s - %s %s proxy to -> %s', new Date().toISOString(), ctx.req.method, ctx.req.oldPath, ctx.req.url)
}
