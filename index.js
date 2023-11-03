/**
 * Dependencies
 */
const { URL } = require('url')
const HttpProxy = require('http-proxy')
const httpProxyCommonUtil = require('http-proxy/lib/http-proxy/common')
const pathMatch = require('path-match')
const { v4: uuidv4 } = require('uuid')
const url = require('url')

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

const REQUEST_IDENTIFIER = '__KOA_PROXIES_MIDDLEWARE_ID__'

const proxyEventHandlers = {}

function setupProxyEventHandler (event) {
  if (['error', 'proxyReq', 'proxyRes'].indexOf(event) < 0) {
    return
  }

  proxyEventHandlers[event] = new Map()

  proxy.on(event, (...args) => {
    const req = args[1]
    const eventHandler = proxyEventHandlers[event].get(req[REQUEST_IDENTIFIER])
    if (typeof eventHandler === 'function') {
      eventHandler(...args)
    }
  })

  return proxyEventHandlers[event]
}

/**
 * Koa Http Proxy Middleware
 */
module.exports = (path, options) => {
  const middlewareId = uuidv4()

  return (ctx, next) => {
    // create a match function
    const match = route(path)
    const params = match(ctx.path)
    if (!params) return next()

    let opts
    if (typeof options === 'function') {
      opts = options.call(options, params, ctx)
      if (opts === false) {
        return next()
      }
    } else {
      opts = Object.assign({}, options)
    }

    const { logs, rewrite, events, ...httpProxyOpts } = opts

    return new Promise((resolve, reject) => {
      ctx.req.oldPath = ctx.req.url

      if (typeof rewrite === 'function') {
        ctx.req.url = rewrite(ctx.req.url, ctx)
      }

      if (logs) {
        typeof logs === 'function' ? logs(ctx, opts.target) : logger(ctx, httpProxyOpts)
      }

      if (events && typeof events === 'object') {
        ctx.req[REQUEST_IDENTIFIER] = middlewareId

        Object
          .entries(events)
          .forEach(([event, handler]) => {
            const eventHandler = proxyEventHandlers[event] == null
              ? setupProxyEventHandler(event)
              : proxyEventHandlers[event]

            if (typeof eventHandler === 'object' && !eventHandler.has(middlewareId)) {
              eventHandler.set(middlewareId, handler)
            }
          })
      }

      // Let the promise be solved correctly after the proxy.web.
      // The solution comes from https://github.com/nodejitsu/node-http-proxy/issues/951#issuecomment-179904134
      ctx.res.on('close', () => {
        reject(new Error(`Http response closed while proxying ${ctx.req.oldPath}`))
      })

      ctx.res.on('finish', () => {
        resolve()
      })

      proxy.web(ctx.req, ctx.res, httpProxyOpts, (e, ...args) => {
        const errorHandler = proxyEventHandlers.error && proxyEventHandlers.error.get(ctx.req[REQUEST_IDENTIFIER])

        if (typeof errorHandler === 'function') {
          errorHandler(e, ...args) // If this error handler sends the headers, the ctx.status setter below is ignored
        }

        const status = {
          ECONNREFUSED: 503,
          ETIMEOUT: 504
        }[e.code]
        ctx.status = status || 500
        resolve()
      })
    })
  }
}

module.exports.proxy = proxy

function logger (ctx, httpProxyOpts) {
  // Because the proxying is done by http-proxy, Getting correct proxied url needs imitating the behavior of http-proxy. **BE CAUTION** that here we rely on inner implementation of http-proxy.
  // See https://github.com/http-party/node-http-proxy/blob/master/lib/http-proxy/common.js#L33
  const outgoing = {}
  let dest
  try {
    // eslint-disable-next-line node/no-deprecated-api
    const httpProxyOpts2 = { ...httpProxyOpts, target: url.parse(httpProxyOpts.target || '') }
    httpProxyCommonUtil.setupOutgoing(outgoing, httpProxyOpts2, ctx.req)
    dest = new URL('', `${httpProxyOpts2.target.protocol}//${outgoing.host}${outgoing.path}`)
  } catch (err) {
    console.error('Error occurs when logging. Please check if target is a valid URL.')
  }
  console.log('%s - %s %s proxy to -> %s', new Date().toISOString(), ctx.req.method, ctx.req.oldPath, `${dest || httpProxyOpts.target}`)
}
