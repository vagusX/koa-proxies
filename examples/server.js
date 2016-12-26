const path = require('path')
const Koa = require('koa')
const history = require('koa-connect-history-api-fallback')
const statics = require('koa-static')
const proxy = require('..')

const proxyTable = {
  '/octocat': 'https://api.github.com/users',
  '/vagusx': {
    target: 'https://api.github.com/users',
    changeOrigin: true,
    logs: true,
    pathRewrite: path => path.replace(/^\/vagusx(\/|\/\w+)?$/, '/vagusx')
  }
}

const app = new Koa()

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

app.listen(12306, e => console.log(e || 'listening at port 12306'))
