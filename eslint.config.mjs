import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Data-loading effects intentionally update local state after I/O.
      'react-hooks/set-state-in-effect': 'off',
      // The current pages keep their loaders beside the effect that invokes them.
      'react-hooks/immutability': 'off',
      // Page loaders list their actual query triggers instead of unstable function identities.
      'react-hooks/exhaustive-deps': 'off',
      // Receipt logos can be tenant-provided URLs and must remain printable as plain images.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
  ]),
]);
