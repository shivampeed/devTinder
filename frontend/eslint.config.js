import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // __BACKEND_URL__ is filled in by vite.config.js at build time
      globals: { ...globals.browser, __BACKEND_URL__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Config and build scripts run in Node, not the browser
    files: ['vite.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
