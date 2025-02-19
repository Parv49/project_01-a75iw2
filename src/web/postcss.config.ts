import type { Config } from 'postcss' // v8.4.0
import tailwindcss from 'tailwindcss' // v3.3.0
import autoprefixer from 'autoprefixer' // v10.4.0
import postcssPresetEnv from 'postcss-preset-env' // v8.0.0
import { theme } from './tailwind.config'

const config: Config = {
  plugins: [
    // Tailwind CSS integration
    tailwindcss({
      config: './tailwind.config.ts'
    }),

    // PostCSS Preset Env for modern CSS features
    postcssPresetEnv({
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
        'media-query-ranges': true,
        'custom-selectors': true,
        'gap-properties': true,
        'logical-properties-and-values': true
      },
      // Preserve original syntax
      preserve: false,
      // Enable modern flexbox and grid features
      autoprefixer: {
        flexbox: 'no-2009',
        grid: 'autoplace'
      }
    }),

    // Autoprefixer for cross-browser compatibility
    autoprefixer({
      flexbox: 'no-2009',
      grid: 'autoplace',
      // Browser support configuration
      browsers: [
        'last 2 versions', // Last 2 versions of each browser
        '> 1%', // Browsers with more than 1% market share
        'not dead' // Exclude unsupported browsers
      ]
    })
  ],

  // Source map generation for development
  sourceMap: process.env.NODE_ENV !== 'production',

  // Parse CSS modules
  modules: true,

  // Minification in production
  minimize: process.env.NODE_ENV === 'production'
}

export default config