# Type declaration checks

After installing the root dependencies, run from the repository root with Node.js 18 or newer:

```sh
npm exec --yes --package=typescript@5.9.3 -- tsc --noEmit --strict --esModuleInterop --target ES2020 --module commonjs test/types/index.ts
```

This compile-only fixture checks existing imports, option types, bypass callbacks,
custom state/context propagation, and rejection of invalid field access. It must
compile without `skipLibCheck`. Do not execute the fixture as JavaScript.

The fixture is separate from the runtime Mocha suite and does not change the
library's Node.js runtime requirements.
