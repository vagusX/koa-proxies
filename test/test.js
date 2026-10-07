const chai = require('chai')
const sinon = require('sinon')

const proxy = require('..')

const { startServer, closeServer, request } = require('./util')

const expect = chai.expect

describe('tests for koa proxies', () => {
  let server
  let targetServer
  let targetUrl
  beforeEach(async () => {
    targetServer = await startServer(async (ctx, next) => {
      switch (ctx.path) {
        case '/204':
          ctx.set('x-special-header', 'you see')
          ctx.body = null
          break
        case '/200':
          ctx.body = { data: 'foo' }
          break
        case '/timeout':
          // Deliberately leave the response open until the proxy aborts it.
          ctx.respond = false
          break
        case '/users/octocat':
          ctx.body = { login: 'octocat', path: ctx.url, host: ctx.host }
          break
        case '/500':
          ctx.status = 500
          break
        case '/error':
          ctx.req.destroy()
          break
        default:
          return next()
      }
    })
    targetUrl = `http://127.0.0.1:${targetServer.address().port}`
  })

  afterEach(async () => {
    sinon.restore()
    await Promise.all([closeServer(server), closeServer(targetServer)])
  })

  it('should match and get correct response', async () => {
    const pathRegex = /^\/octocat(\/|\/\w+)?$/
    const proxyMiddleware = proxy('/octocat', {
      target: targetUrl,
      changeOrigin: true,
      rewrite: path => {
        if (pathRegex.test(path)) {
          const [, subpath] = pathRegex.exec(path)
          if (subpath && subpath.startsWith('/bar')) {
            return '/200'
          }
          return path.replace(/^\/octocat(\/|\/\w+)?$/, '/204')
        } else {
          return path
        }
      },
      logs: true
    })

    server = await startServer(proxyMiddleware)

    const ret = await request(server, '/octocat')
    expect(ret.status).to.equal(204)
    expect(ret.headers['x-special-header']).to.equal('you see')
    expect(ret.body).to.equal('')

    const ret1 = await request(server, '/octocat/bar')
    expect(ret1.status).to.equal(200)
    expect(ret1.body).to.eqls({ data: 'foo' })

    const ret2 = await request(server, '/notfound')
    expect(ret2.status).to.equal(404)
  })

  it('test for options as function', async () => {
    // supports https://github.com/vagusX/koa-proxies/issues/17
    const pathRegex = /^\/octocat(\/|\/\w+)?$/
    const proxyMiddleware = proxy('/octocat', (params, ctx) => {
      if (ctx.headers.foo === 'bar') {
        return {
          target: targetUrl,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/500'),
          logs: true
        }
      }

      return {
        target: targetUrl,
        changeOrigin: true,
        rewrite: path => {
          if (pathRegex.test(path)) {
            const [, subpath] = pathRegex.exec(path)
            if (subpath && subpath.startsWith('/bar')) {
              return '/200'
            }
            return path.replace(/^\/octocat(\/|\/\w+)?$/, '/204')
          } else {
            return path
          }
        },
        logs: true
      }
    })

    server = await startServer(proxyMiddleware)

    const ret = await request(server, '/octocat')
    expect(ret.status).to.equal(204)
    expect(ret.headers['x-special-header']).to.equal('you see')
    expect(ret.body).to.equal('')

    const ret1 = await request(server, '/octocat/bar')
    expect(ret1.status).to.equal(200)
    expect(ret1.body).to.eqls({ data: 'foo' })

    const ret2 = await request(server, '/notfound')
    expect(ret2.status).to.equal(404)

    // headers matched for 500
    const ret3 = await request(server, '/octocat', {
      method: 'POST',
      headers: { foo: 'bar' },
      body: { body: 'test' }
    })
    expect(ret3.status).to.equal(500)
  })

  it('can leverage path matching params', async () => {
    const proxyMiddleware = proxy('/octocat/:status', (params, ctx) => {
      return {
        target: targetUrl,
        changeOrigin: true,
        rewrite: () => `/${params.status}`,
        logs: true
      }
    })

    server = await startServer(proxyMiddleware)

    const ret = await request(server, '/octocat/204')
    expect(ret.status).to.equal(204)
    expect(ret.headers['x-special-header']).to.equal('you see')
    expect(ret.body).to.equal('')

    const ret1 = await request(server, '/octocat/200')
    expect(ret1.status).to.equal(200)
    expect(ret1.body).to.eqls({ data: 'foo' })

    const ret2 = await request(server, '/notfound')
    expect(ret2.status).to.equal(404)

    const ret3 = await request(server, '/octocat/500')
    expect(ret3.status).to.equal(500)
  })

  it('test for options as function which can return `false` value and get bypassed', async () => {
    const pathRegex = /^\/octocat(\/|\/\w+)?$/
    const proxyMiddleware = proxy(
      {
        path: '/octocat'
      },
      (params, ctx) => {
        // require header matching
        if (ctx.headers['x-custom-header'] !== 'custom header value') {
          return false
        }
        return {
          target: targetUrl,
          changeOrigin: true,
          rewrite: path => {
            if (pathRegex.test(path)) {
              const [, subpath] = pathRegex.exec(path)
              if (subpath && subpath.startsWith('/bar')) {
                return '/200'
              }
              return path.replace(pathRegex, '/204')
            } else {
              return path
            }
          },
          logs: true
        }
      }
    )
    server = await startServer(proxyMiddleware, async (ctx) => {
      if (ctx.url.endsWith('baz')) {
        ctx.body = { data: 'Hello test' }
      }
    })

    // Match both path and headers
    const ret = await request(server, '/octocat', { headers: { 'x-custom-header': 'custom header value' } })
    expect(ret.status).to.equal(204)
    expect(ret.headers['x-special-header']).to.equal('you see')
    expect(ret.body).to.equal('')

    // Match both path and headers
    const ret2 = await request(server, '/octocat/bar', { headers: { 'x-custom-header': 'custom header value' } })
    expect(ret2.status).to.equal(200)
    expect(ret2.body).to.eqls({ data: 'foo' })

    // If request only match path, it should not be proxied
    const ret3 = await request(server, '/octocat', { headers: { 'x-custom-header': 'custom header value not matched' } })
    expect(ret3.status).to.equal(404)

    const ret4 = await request(server, '/octocat/bar') // no header at all
    expect(ret4.status).to.equal(404)

    const ret5 = await request(server, '/octocat/bar/baz') // no header at all, but match other middleware
    expect(ret5.status).to.equal(200)
    expect(ret5.body).to.eqls({ data: 'Hello test' })
  })

  it('should bypass when path not matched', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: targetUrl,
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/200'),
      logs: true
    })

    server = await startServer(proxyMiddleware, async ctx => {
      ctx.body = { data: 'Hello test' }
    })

    const ret = await request(server, '/testcat')
    expect(ret.status).to.equal(200)
    expect(ret.body).to.eqls({ data: 'Hello test' })
  })

  it('500', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: targetUrl,
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/500'),
      logs: true
    })

    server = await startServer(proxyMiddleware)

    const ret = await request(server, '/octocat')
    expect(ret.status).to.equal(500)
  })

  it('503', async () => {
    // Keep the target listening so the proxy server cannot reuse its port.
    const proxyMiddleware = proxy('/octocat', {
      target: targetUrl,
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/200'),
      logs: true
    })

    server = await startServer(proxyMiddleware)

    // Close the target to trigger ECONNREFUSED (503).
    await closeServer(targetServer)
    const ret = await request(server, '/octocat')
    expect(ret.status).to.equal(503)
  })

  it('awaits a real upstream timeout', async () => {
    const errorSpy = sinon.spy()
    server = await startServer(proxy('/timeout', {
      target: targetUrl,
      proxyTimeout: 50,
      events: { error: errorSpy }
    }))

    const ret = await request(server, '/timeout')
    // http-proxy aborts timed-out requests with ECONNRESET, which maps to 500.
    expect(ret.status).to.equal(500)
    sinon.assert.calledOnce(errorSpy)
    expect(errorSpy.firstCall.args[0].code).to.equal('ECONNRESET')
  })

  it('maps an ETIMEOUT proxy error to 504', async () => {
    const web = sinon.stub(proxy.proxy, 'web').callsFake((req, res, options, callback) => {
      callback(Object.assign(new Error('Upstream timed out'), { code: 'ETIMEOUT' }))
    })
    server = await startServer(proxy('/timeout', { target: targetUrl }))

    const ret = await request(server, '/timeout')
    expect(ret.status).to.equal(504)
    sinon.assert.calledOnce(web)
  })

  it('events for a single middleware', async () => {
    // spies
    const proxyReqSpy = sinon.spy()
    const proxyResSpy = sinon.spy()

    const proxyMiddleware = proxy('/200', {
      target: targetUrl,
      changeOrigin: true,
      logs: true,
      events: {
        proxyReq: proxyReqSpy,
        proxyRes: proxyResSpy
      }
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/200')
    sinon.assert.calledOnce(proxyReqSpy)
    sinon.assert.calledOnce(proxyResSpy)
  })

  it('events for multiple middleware', async () => {
    // spies
    const proxyOneReqSpy = sinon.spy()
    const proxyOneResSpy = sinon.spy()
    const proxyTwoReqSpy = sinon.spy()
    const proxyTwoResSpy = sinon.spy()

    const proxyOneMiddleware = proxy('/200', {
      target: targetUrl,
      changeOrigin: true,
      logs: true,
      events: {
        proxyReq: proxyOneReqSpy,
        proxyRes: proxyOneResSpy
      }
    })

    const proxyTwoMiddleware = proxy('/204', {
      target: targetUrl,
      changeOrigin: true,
      logs: true,
      events: {
        proxyReq: proxyTwoReqSpy,
        proxyRes: proxyTwoResSpy
      }
    })

    server = await startServer(proxyOneMiddleware, proxyTwoMiddleware)

    await request(server, '/200')
    sinon.assert.calledOnce(proxyOneReqSpy)
    sinon.assert.calledOnce(proxyOneResSpy)

    await request(server, '/204')
    sinon.assert.calledOnce(proxyTwoReqSpy)
    sinon.assert.calledOnce(proxyTwoResSpy)
  })

  it('ignore events for middleware if they are not a valid event', async () => {
    // spies
    const proxyInvalidEventSpy = sinon.spy()

    const proxyMiddleware = proxy('/200', {
      target: targetUrl,
      changeOrigin: true,
      logs: true,
      events: {
        proxyInvalid: proxyInvalidEventSpy
      }
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/200')
    sinon.assert.notCalled(proxyInvalidEventSpy)
  })

  describe('when an error handler is specified', () => {
    let options

    beforeEach(async () => {
      options = {
        target: targetUrl,
        changeOrigin: true,
        events: {}
      }

      const proxyMiddleware = proxy('/error', options)

      server = await startServer(proxyMiddleware)
    })

    it('does not set the status in the default error handler when events.error is specified and ends the response', async () => {
      options.events.error = sinon.stub().callsFake((e, req, res) => {
        res.writeHead(505, 'Something went wrong. And we are reporting a custom error message.').end()
      })

      const ret = await request(server, '/error')
      expect(ret.status).to.equal(505)
      expect(ret.statusMessage).to.eql('Something went wrong. And we are reporting a custom error message.')

      sinon.assert.calledOnce(options.events.error)
    })

    it('does set the status in the default error handler when events.error is specified but does not end the response', async () => {
      options.events.error = sinon.spy()

      const ret = await request(server, '/error')
      expect(ret.status).to.equal(500)

      sinon.assert.calledOnce(options.events.error)
    })
  })

  it('log', async () => {
    // spies
    const logSpy = sinon.spy(console, 'log')

    const proxyMiddleware = proxy('/200', {
      target: targetUrl,
      changeOrigin: true,
      logs: true
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/200')
    sinon.assert.called(logSpy)
    console.log.restore()
  })

  it('log with correct outgoing url', async () => {
    // spies
    const logSpy = sinon.spy(console, 'log')

    const proxyMiddleware = proxy('/baz', {
      target: `${targetUrl}/foo/bar`,
      changeOrigin: true,
      prependPath: false,
      logs: true
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/baz')
    const logSpyCall = logSpy.getCall(0)
    chai.expect(logSpyCall.args).to.contains(`${targetUrl}/baz`)
    console.log.restore()
  })

  it('log function', async () => {
    // spies
    const logSpy = sinon.spy()

    const proxyMiddleware = proxy('/200', {
      target: targetUrl,
      changeOrigin: true,
      logs: logSpy
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/200')
    sinon.assert.calledOnce(logSpy)
  })

  it('log while error occurs', async () => {
    const logSpy = sinon.spy(console, 'error')
    // This test exercises logging; never make a network request to the invalid target.
    sinon.stub(proxy.proxy, 'web').callsFake((req, res, options, callback) => {
      callback(new Error('Invalid target'))
    })

    const proxyMiddleware = proxy('/200', {
      target: 'abc.com', // should be prepended with http(s)://
      changeOrigin: true,
      logs: true
    })

    server = await startServer(proxyMiddleware)

    await request(server, '/200')
    sinon.assert.called(logSpy)
    console.error.restore()
  })

  it('preserves the target base path when rewriting', async () => {
    const proxyReqSpy = sinon.spy()
    server = await startServer(proxy('/octocat', {
      target: `${targetUrl}/users/`,
      changeOrigin: true,
      rewrite: () => '/octocat',
      events: { proxyReq: proxyReqSpy }
    }))

    const ret = await request(server, '/octocat')
    expect(ret.status).to.equal(200)
    expect(ret.body).to.eql({
      login: 'octocat', path: '/users/octocat', host: new URL(targetUrl).host
    })
    sinon.assert.calledOnce(proxyReqSpy)
    const proxyReq = proxyReqSpy.firstCall.args[0]
    expect(proxyReq.path).to.equal('/users/octocat')
    expect(proxyReq.getHeader('host')).to.equal(new URL(targetUrl).host)
  })

  it('rewrites path parameters against a local upstream', async () => {
    server = await startServer(proxy('/octocat/:name', params => ({
      target: targetUrl,
      changeOrigin: true,
      rewrite: () => `/users/${params.name}`
    })))

    const ret = await request(server, '/octocat/octocat')
    expect(ret.status).to.equal(200)
    expect(ret.body.login).to.equal('octocat')
    expect(ret.body.path).to.equal('/users/octocat')
  })
})
