# Type declaration checks

From the repository root, use a modern Node.js version (Node 24 in CI):

```sh
npm ci --prefix test/types
npm run test:types
```

The isolated, locked toolchain compiles the same fixture with TypeScript 5.9.3
against both `@types/koa` 2.11.0 and 2.15.2. The legacy alias and TypeScript path
mapping let both versions run without reinstalling or changing the lockfile.

The fixture covers existing imports, option types, bypass callbacks, custom
state/context propagation, and rejection of invalid field access. Both checks
use strict checking without `skipLibCheck`. Do not execute the fixture as JavaScript.

This tooling is separate from the runtime Mocha suite: its Node.js requirements
do not set a minimum runtime version for users of the library. The runtime suite
runs against Node 12, 14, 16, 18, 20, 22 and 24 in CI.
