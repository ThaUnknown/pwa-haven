const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const webpack = require('webpack')
const info = require('webtorrent/package.json')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

/** @type {import('webpack').WebpackOptionsNormalized} */
module.exports = {
  entry: {
    'build/bundle': ['./src/main.js']
  },
  context: process.cwd() + '/torrent-client/',
  resolve: {
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    aliasFields: ['browser'],
    alias: {
      ...info.browser,
      crypto: false,
      http: 'stream-http',
      https: 'stream-http',
      stream: 'readable-stream',
      path: 'path-browserify',
      svelte: path.dirname(require.resolve('svelte/package.json'))
    }
  },
  output: {
    path: process.cwd() + '/torrent-client/public',
    filename: '[name].js',
    chunkFilename: '[name].[id].js'
  },
  module: {
    rules: [
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: !prod
            },
            emitCss: prod,
            hotReload: !prod
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        // required to prevent errors from Svelte on Webpack 5+
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  },
  mode,
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process-fast',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      global: 'globalThis'
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  devtool: 'source-map',
  devServer: {
    hot: true,
    static: {
      directory: './torrent-client/public'
    },
    client: {
      overlay: { errors: true, warnings: false }
    },
    port: 5000
  }
}
