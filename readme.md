# Koa Proxies

![NPM](https://img.shields.io/npm/v/koa-proxies.svg)

[![Node.js CI](https://github.com/vagusX/koa-proxies/actions/workflows/node.js.yml/badge.svg)](https://github.com/vagusX/koa-proxies/actions/workflows/node.js.yml)
[![Coverage](https://img.shields.io/codecov/c/github/vagusX/koa-proxies.svg)](https://codecov.io/gh/vagusX/koa-proxies)
[![NPM Downloads](https://img.shields.io/npm/dm/koa-proxies.svg)](https://www.npmjs.com/package/koa-proxies)
[![Greenkeeper badge](https://badges.greenkeeper.io/vagusX/koa-proxies.svg)](https://greenkeeper.io/)

> [Koa@2.x/next](https://github.com/koajs/koa) middlware for http proxy

Powered by [`http-proxy`](https://github.com/nodejitsu/node-http-proxy).

## Installation

```bash
$ npm install koa-proxies --save
```

## Options

### http-proxy events

```js
options.events = {
  error (err, req, res) { },
  proxyReq (proxyReq, req, res) { },
  proxyRes (proxyRes, req, res) { }
}
```

### log option
```js
// enable log
options.logs = true; // or false

// custom log function
options.logs = (ctx, target) {
  console.log('%s - %s %s proxy to -> %s', new Date().toISOString(), ctx.req.method, ctx.req.oldPath, new URL(ctx.req.url, target))
}
```

## Usage

```js
// dependencies
const Koa = require('koa')
const proxy = require('koa-proxies')
const httpsProxyAgent = require('https-proxy-agent')

const app = new Koa()

// middleware
app.use(proxy('/octocat', {
  target: 'https://api.github.com/users/',
  changeOrigin: true,
  agent: new httpsProxyAgent('http://1.2.3.4:88'), // if you need or just delete this line
  rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/vagusx'),
  logs: true
}))
```
The 2nd parameter `options` can be a function. It will be called with the path matching result (see [path-match](https://www.npmjs.com/package/path-match) for details) and Koa `ctx` object. You can leverage this feature to dynamically set proxy. Here is an example:

```js
// dependencies
const Koa = require('koa')
const proxy = require('koa-proxies')

const app = new Koa()

// middleware
app.use(proxy('/octocat/:name', (params, ctx) => {
  return {
    target: 'https://api.github.com/',
    changeOrigin: true,
    rewrite: () => `/users/${params.name}`,
    logs: true
  }})
)
```
Moreover, if the `options` function return `false`, then the proxy will be bypassed. This allows the middleware to bail out even if path matching succeeds, which could be helpful if you need complex logic to determine whether to proxy or not.


### Attention

Please make sure that `koa-proxies` is in front of `koa-bodyparser` to avoid this [issue 55](https://github.com/vagusX/koa-proxies/issues/55)

```js
const Koa = require('koa')
const app = new Koa()
const proxy = require('koa-proxies')
const bodyParser = require('koa-bodyparser')

app.use(proxy('/user', {
  target: 'http://example.com',
  changeOrigin: true
}))

app.use(bodyParser())
```

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
