
/**
 * Dependencies
 */

import HttpProxy from 'http-proxy'

/**
 * Constants
 */

const proxy = HttpProxy.createProxyServer()

/**
 * Koa Http Proxy Middleware
 */

export default (context, options) => (ctx, next) => {
  if (!ctx.req.url.startsWith(context)) return next()

  const { logLevel, pathRewrite } = options

  return next().then(() => new Promise((resolve, reject) => {
    logger(logLevel, ctx)

    if (typeof pathRewrite === 'function') {
      ctx.req.url = pathRewrite(ctx.req.url)
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
