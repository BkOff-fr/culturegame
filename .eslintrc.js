/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@next/eslint-config-next'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Configuration adaptée pour CultureGame

    // Autoriser 'any' dans certains cas spécifiques (à utiliser avec parcimonie)
    '@typescript-eslint/no-explicit-any': 'warn', // warn au lieu d'error

    // Autoriser require() dans server.js (Node.js)
    '@typescript-eslint/no-require-imports': 'off',

    // Variables non utilisées en warning au lieu d'error
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],

    // React
    'react/no-unescaped-entities': [
      'error',
      {
        forbid: [
          { char: '>', after: '}' },
          { char: '}', after: '>' }
        ]
      }
    ],

    // Hooks React - warning au lieu d'error pour plus de flexibilité
    'react-hooks/exhaustive-deps': 'warn',

    // Import/Export
    'import/no-unused-modules': 'off',

    // Console.log autorisé en développement
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // Préférences de style
    'prefer-const': 'error',
    'no-var': 'error',

    // Sécurité - garder ces règles strictes
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // TypeScript spécifique
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description'
      }
    ],

    // Next.js spécifique
    '@next/next/no-html-link-for-pages': 'off'
  },
  overrides: [
    // Configuration spécifique pour server.js (Node.js)
    {
      files: ['server.js', 'socket-server.js'],
      env: {
        node: true,
        es6: true
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    // Configuration spécifique pour les fichiers de types
    {
      files: ['src/types/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off' // Autorisé dans les types
      }
    },
    // Configuration spécifique pour les tests
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    // Configuration spécifique pour les fichiers de config
    {
      files: ['*.config.js', '*.config.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    '*.d.ts',
    'prisma/migrations/'
  ]
};