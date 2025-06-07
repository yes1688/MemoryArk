/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  env: {
    node: true,
    browser: true
  },
  rules: {
    // 允許未使用的變數（在開發階段）
    'no-unused-vars': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    
    // 允許 any 類型（在某些情況下）
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // 允許空函數
    '@typescript-eslint/no-empty-function': 'warn',
    
    // Vue 特定規則
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'warn'
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        // Vue 組件特定規則
        'no-undef': 'off'
      }
    }
  ]
}