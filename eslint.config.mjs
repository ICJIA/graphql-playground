import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-plugin-prettier/recommended'

export default withNuxt(prettier, {
  rules: {
    // Allow console in server routes and dev scripts
    'no-console': 'warn',

    // Vue-specific relaxations for this project
    'vue/multi-word-component-names': 'off',

    // TypeScript relaxations
    '@typescript-eslint/no-explicit-any': 'off'
  }
})
