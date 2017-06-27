/**
 * Dependencies
 */

const HttpProxy = require('http-proxy')

/**
 * Constants
 */

const proxy = HttpProxy.createProxyServer()

/**
 * Koa Http Proxy Middleware
 */

module.exports = (context, options) => (ctx, next) => {
  if (!ctx.req.url.startsWith(context)) return next()

  const { logs, rewrite } = options

  return new Promise((resolve, reject) => {
    if (logs) logger(ctx)

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url)
    }

    let opts = options
    if (typeof options === 'function') {
      opts = options.call(options)
    }

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
  console.log('%s - %s %s', new Date().toISOString(), ctx.req.method, ctx.req.url)
}
