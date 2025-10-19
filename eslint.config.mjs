// eslint.config.mjs
import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';

export default [
  ...next(),
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
    // overrides: [{ files: ['src/app/api/**', 'src/app/lib/**'], rules: { '@typescript-eslint/no-explicit-any': 'off' } }],
  },
];
