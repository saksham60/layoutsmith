// .eslintrc.cjs
module.exports = {
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // 🚫 only disable this one rule across the repo
    '@typescript-eslint/no-explicit-any': 'off',
  },
  // (Optional) limit it to server folders where quick pragmatism is fine:
  // overrides: [
  //   { files: ['src/app/api/**', 'src/app/lib/**'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  // ],
};
