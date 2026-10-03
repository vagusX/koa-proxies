# Koa Proxies

![NPM](https://img.shields.io/npm/v/koa-proxies.svg)

[![Node.js CI](https://github.com/vagusX/koa-proxies/actions/workflows/node.js.yml/badge.svg)](https://github.com/vagusX/koa-proxies/actions/workflows/node.js.yml)
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


### TypeScript

Pass your application's state and context types to type the options and logging
callbacks, as well as the returned middleware:

```ts
import proxy = require('koa-proxies')

proxy<{ userId: string }, { tenant: string }>('/api', (params, ctx) => ({
  target: `https://${ctx.tenant}.example.com`,
  logs: ctx => console.log(ctx.state.userId)
}))
```

These types describe fields provided by your application; they do not create or
validate those fields at runtime. Existing calls without type arguments and
options callbacks returning `false` remain supported.

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

## Development checks

```sh
npm ci
npm run ci
```

This uses the committed lockfile for a reproducible baseline. CI also runs the
same lint, runtime tests and coverage checks with freshly resolved dependencies
on every Node version in the matrix. To reproduce that check, use a fresh
checkout with no `node_modules` and run:

```sh
npm install --package-lock=false
npm run ci
```

The second install ignores the repository lockfile and resolves the ranges in
`package.json`. Failures in either installation mode fail CI. A library's
lockfile does not constrain its consumers' dependency versions: these checks
cover the locked baseline and a fresh resolution, not every possible downstream
dependency combination.

Runtime tests use local HTTP fixtures and run on Node 12, 14, 16, 18, 20, 22 and
24 in CI. Older versions remain compatibility checks, not security-support
recommendations. Coverage is saved as a `coverage` artifact in the
[CI run](https://github.com/vagusX/koa-proxies/actions/workflows/node.js.yml).

Type declaration checks use a separate modern toolchain; see
[test/types](test/types/README.md) for the locked setup and commands.

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
