/**
 * Dependencies
 */
const url = require('url')
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

let eventRegistered = false

/**
 * Koa Http Proxy Middleware
 */
module.exports = (context, options) => (ctx, next) => {
  // create a match function
  const match = route(context)
  if (!match(ctx.path)) return next()

  let opts = Object.assign({}, options)
  if (typeof options === 'function') {
    const params = match(ctx.path)
    opts = options.call(options, params)
  }
  // object-rest-spread is still in stage-3
  // https://github.com/tc39/proposal-object-rest-spread
  const { logs, rewrite, events, exclude } =  opts
  if (typeof exclude === 'function' && exclude(request)) {
    return next()
  }

  const httpProxyOpts = Object.keys(opts)
    .filter(n => ['logs', 'rewrite', 'events'].indexOf(n) < 0)
    .reduce((prev, cur) => {
      prev[cur] = opts[cur]
      return prev
    }, {})

  return new Promise((resolve, reject) => {
    ctx.req.oldPath = ctx.req.url

    if (typeof rewrite === 'function') {
      ctx.req.url = rewrite(ctx.req.url)
    }

    if (logs) logger(ctx, opts.target)

    if (events && typeof events === 'object' && !eventRegistered) {
      Object.entries(events).forEach(([event, handler]) => {
        proxy.on(event, handler)
      })
      eventRegistered = true
    }

    proxy.web(ctx.req, ctx.res, httpProxyOpts, e => {
      const status = {
        ECONNREFUSED: 503,
        ETIMEOUT: 504
      }[e.code]
      if (status) ctx.status = status
      resolve()
    })
  })
}

module.exports.proxy = proxy

function logger (ctx, target) {
  console.log('%s - %s %s proxy to -> %s', new Date().toISOString(), ctx.req.method, ctx.req.oldPath, url.resolve(target, ctx.req.url))
}
