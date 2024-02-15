const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const webpack = require('webpack')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

module.exports = {
  entry: {
    'build/bundle': ['./src/main.js'],
    'build/cast': ['./src/cast.js']
  },
  cache: false,
  context: process.cwd() + '/video-player/',
  externals: {
    anitomyscript: 'anitomyscript'
  },
  resolve: {
    aliasFields: ['svelte', 'browser', 'module', 'main'],
    alias: {
      svelte: path.dirname(require.resolve('svelte/package.json'))
    },
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main'],
    fallback: {
      zlib: path.resolve(__dirname, '../video-player/src/modules/inflateSync.js')
    }
  },
  output: {
    path: process.cwd() + '/video-player/public',
    filename: '[name].js',
    chunkFilename: '[name].[id].js',
    assetModuleFilename: '[name][ext]'
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
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ],
  devtool: 'source-map',
  devServer: {
    hot: false, // IDB, and workers break :/
    static: {
      directory: './video-player/public'
    },
    client: {
      overlay: { errors: true, warnings: false }
    },
    port: 5000
  }
}
