import { defineConfig } from 'vite'; // ^4.4.0
import react from '@vitejs/plugin-react'; // ^4.0.0
import checker from 'vite-plugin-checker'; // ^0.6.0
import path from 'path';

export default defineConfig({
  plugins: [
    // React plugin configuration with Fast Refresh and automatic JSX runtime
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    
    // TypeScript and ESLint checking during development
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint ./src --ext .ts,.tsx',
        dev: {
          logLevel: ['error']
        }
      },
      overlay: {
        initialIsOpen: false
      }
    })
  ],

  // Path aliases for better code organization
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
      '@features': path.resolve(__dirname, 'src/features')
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // Build configuration for production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          game: ['@store/game', '@components/game'],
          word: ['@store/word', '@components/word'],
          ui: ['@components/ui', '@styles/ui'],
          utils: ['@utils', '@hooks']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    target: 'es2015',
    reportCompressedSize: true
  }
});