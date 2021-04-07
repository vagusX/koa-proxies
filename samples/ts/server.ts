import * as path from 'path'
import * as Koa from 'koa'
import * as history from 'koa-connect-history-api-fallback'
import * as statics from 'koa-static'
import * as HttpsProxyAgent from 'https-proxy-agent'

import * as proxy from '../..'

const agentUrl = process.env.http_proxy || process.env.https_proxy

const proxyTable: { [key: string]: proxy.IKoaProxiesOptions } = {
  '/octocat': 'https://api.github.com/users',
  '/api': {
    target: 'http://localhost:8111',
    logs: true,
    headers: {
      'X_HOST_S': 'google.com'
    }
  },
  '/example/:id': (params, ctx: Koa.Context) => {
    return {
      target: 'http://localhost:8111',
      logs: true,
      headers: {
        'X_HOST_S': 'google.com'
      }
    }
  },
  '/users/:id': {
    target: 'https://api.github.com',
    changeOrigin: true,
    logs: true,
    agent: agentUrl ? new HttpsProxyAgent(agentUrl) : null,
    headers: {
      'XHostS': 'google.com'
    },
    rewrite: path => path.replace(/\/node$/, '/vagusx'),
    events: {
      error (err, req, res) {
        console.log(err)
      },
      proxyRes (proxyRes, req, res) {
        res.setHeader('X-Special-Test-Header', 'proxy')
      }
    }
  }
}

const app = new Koa()

app.use(async (ctx, next) => {
  // console.log('-----------------')
  // console.log(ctx.request.headers)
  // console.log('-----------------')
  await next()
})

Object.keys(proxyTable).forEach(context => {
  let options = proxyTable[context]
  if (typeof options === 'string') {
    options = {
      target: options,
      changeOrigin: true,
      logs: true
    }
  }
  app.use(proxy(context, options))
})

// history fallback
app.use(history({
  verbose: true
}))

// static
app.use(statics(path.resolve('examples/statics')))

app.listen(12306, () => console.log('listening at port 12306'))
