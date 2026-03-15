import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/index.tsx',
        'src/ui/**',
        'src/types/**',
      ],
      thresholds: { lines: 85, branches: 80 },
    },
  },
})
