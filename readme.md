# Koa Proxies

![NPM](https://img.shields.io/npm/v/koa-proxies.svg)
[![Build Status](https://travis-ci.org/vagusX/koa-proxies.svg)](https://travis-ci.org/vagusX/koa-proxies)

> [Koa@2.x/next](https://github.com/koajs/koa) middlware for http proxy

Powered by [`http-proxy`](https://github.com/nodejitsu/node-http-proxy).

## Installation

```bash
$ npm install koa-proxies --save
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
  target: 'https://api.github.com/users',    
  changeOrigin: true,
  agent: new httpsProxyAgent('http://1.2.3.4:88'),
  rewrite: path => path.replace(/^\/octocat(\/|\/\w+)?$/, '/vagusx'),
  logs: true
}))
```

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
