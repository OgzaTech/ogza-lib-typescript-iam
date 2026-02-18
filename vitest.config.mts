import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8', // En hızlı kapsama motoru
      reporter: ['text', 'json', 'html'], // 'text' terminalde tablo oluşturur
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/constants/**', // Sabitleri test etmeye gerek yok
      ] 
    },
  },
});