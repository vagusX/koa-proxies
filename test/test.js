const chai = require('chai')
const chaiHttp = require('chai-http')
const sinonChai = require('sinon-chai')
const sinon = require('sinon')

const proxy = require('..')

const { startServer, sleep } = require('./util')

chai.use(sinonChai)
chai.use(chaiHttp)
const expect = chai.expect

describe('tests for koa proxies', () => {
  let server
  let targetServer
  beforeEach(() => {
    targetServer = startServer(12306, async (ctx, next) => {
      switch (ctx.path) {
        case '/204':
          ctx.set('x-special-header', 'you see')
          ctx.body = null
          break
        case '/200':
          ctx.body = { data: 'foo' }
          break
        case '/timeout':
          await sleep(2000)
          ctx.body = { data: 'timeout' }
          break
        case '/500':
          ctx.status = 500
          break
        default:
          return next()
      }
    })
  })

  afterEach(() => {
    targetServer && targetServer.close()
    server && server.close()
  })

  it('should match and get correct response', async () => {
    const pathRegex = /^\/octocat(\/|\/\w+)?$/
    const proxyMiddleware = proxy('/octocat', {
      target: 'http://127.0.0.1:12306',
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

    server = startServer(3000, proxyMiddleware)
    const requester = chai.request(server).keepOpen()

    const ret = await requester.get('/octocat')
    expect(ret).to.have.status(204)
    expect(ret).to.have.header('x-special-header', 'you see')
    expect(ret.body).to.eqls({})

    const ret1 = await requester.get('/octocat/bar')
    expect(ret1).to.have.status(200)
    expect(ret1.body).to.eqls({ data: 'foo' })

    const ret2 = await requester.get('/notfound')
    expect(ret2).to.have.status(404)
  })

  it('should bypass when path not matched', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/200'),
      logs: true
    })

    server = startServer(3000, proxyMiddleware, async ctx => {
      ctx.body = { data: 'Hello test' }
    })

    const ret = await chai.request(server).get('/testcat')
    expect(ret).to.have.status(200)
    expect(ret.body).to.eqls({ data: 'Hello test' })
  })

  it('500', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/500'),
      logs: true
    })

    server = startServer(3000, proxyMiddleware)

    const ret = await chai.request(server).get('/octocat')
    expect(ret).to.have.status(500)
  })

  it('503', async () => {
    const proxyMiddleware = proxy('/octocat', {
      // wrong port cause ECONNREFUSED
      target: 'http://127.0.0.1:12305',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/200'),
      logs: true
    })

    server = startServer(3000, proxyMiddleware)

    const ret = await chai.request(server).get('/octocat')
    expect(ret).to.have.status(503)
  })

  it('504', async () => {
    const proxyMiddleware = proxy('/timeout', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      logs: true
    })

    server = startServer(3000, proxyMiddleware)

    chai.request(server).get('/timeout')
      .then(ret => {
        expect(ret).to.have.status(504)
      })
  }).timeout(200)

  it('events', async () => {
    // spies
    const proxyReqSpy = sinon.spy()
    const proxyResSpy = sinon.spy()

    const proxyMiddleware = proxy('/200', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      logs: true,
      events: {
        proxyReq: proxyReqSpy,
        proxyRes: proxyResSpy
      }
    })

    server = startServer(3000, proxyMiddleware)

    await chai.request(server).get('/200')
    sinon.assert.calledOnce(proxyReqSpy)
    sinon.assert.calledOnce(proxyResSpy)
  })

  it('log', async () => {
    // spies
    sinon.spy(console, 'log')

    const proxyMiddleware = proxy('/200', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      logs: true,
    })

    server = startServer(3000, proxyMiddleware)

    await chai.request(server).get('/200')
    expect(console.log).to.be.called
    console.log.restore()
  })

  it('log function', async () => {
    // spies
    const logSpy = sinon.spy()

    const proxyMiddleware = proxy('/200', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      logs: logSpy
    })

    server = startServer(3000, proxyMiddleware)

    await chai.request(server).get('/200')
    sinon.assert.calledOnce(logSpy)
  })

  it.skip('test using github API', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: 'https://api.github.com/users',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/vagusx'),
      logs: true
    })

    server = startServer(3000, proxyMiddleware)

    const ret = await chai.request(server).get('/octocat')
    expect(ret).to.have.status(200)
  })
})
