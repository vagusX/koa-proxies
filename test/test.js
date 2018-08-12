const chai = require('chai')
const chaiHttp = require('chai-http')

const proxy = require('..')

const { startServer } = require('./util')

chai.use(chaiHttp)
const expect = chai.expect

describe('tests for koa proxies', () => {
  let server
  let targetServer
  beforeEach(() => {
    targetServer = startServer(12306, async (ctx) => {
      switch (ctx.request.url) {
        case '/204':
          ctx.set('x-special-header', 'you see')
          ctx.body = null
        case '/200':
          ctx.body = '200'
      }
    })
  })

  afterEach(() => {
    targetServer && targetServer.close()
    server && server.close()
  })

  it('should match and get correct response', async () => {
    const proxyMiddleware = proxy('/octocat', {
      target: 'http://127.0.0.1:12306',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/204'),
      logs: true
    })

    server = startServer(3000, proxyMiddleware)

    const ret = await chai.request(server).get('/octocat')
    expect(ret).to.have.status(204)
    expect(ret).to.have.header('x-special-header', 'you see')
    expect(ret.body).to.eqls({})
  })

  it('test using github API', async () => {
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
