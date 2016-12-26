
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

  const { logLevel, rewrite } = options

  return next().then(() => new Promise((resolve, reject) => {
    logger(logLevel, ctx)

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url)
    }

    proxy.web(ctx.req, ctx.res, options, e => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504
      }[e.code]
      if (status) ctx.status = status
      resolve()
    })
  }))
}

function logger (logLevel, ctx) {
  if (logLevel) {
    console.log('%s - %s %s', new Date().toISOString(), ctx.req.method, ctx.req.url)
  }
}
