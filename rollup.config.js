const rollup = require('rollup')
const buble = require('rollup-plugin-buble')
const eslint = require('rollup-plugin-eslint')
const globals = require('rollup-plugin-node-globals')

const pkg = require('./package.json')
const external = Object.keys(pkg.dependencies)

let cache

rollup.rollup({
  entry: 'lib/index.js',
  cache: cache,
  external: external,
  plugins: [
    eslint(),
    buble(),
    globals()
  ]
}).then(bundle => {
  // cache bundle
  cache = bundle
  bundle.write({
    format: 'cjs',
    dest: pkg['main']
  })

  if (process.env.NODE_ENV === 'production') {
    bundle.write({
      dest: pkg['jsnext:main'],
      format: 'es'
    })
  }
})
