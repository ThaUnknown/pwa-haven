const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')
const webpack = require('webpack')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

const mode = process.env.NODE_ENV || 'development'
const prod = mode === 'production'

module.exports = {
  entry: {
    'torrent-client/public/build/bundle': ['./torrent-client/src/main.js']
  },
  resolve: {
    alias: {
      svelte: path.dirname(require.resolve('svelte/package.json'))
    },
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  output: {
    path: process.cwd(),
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
      process: 'process-fast'
    }),
    new NodePolyfillPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  devtool: 'source-map',
  devServer: {
    hot: true,
    static: {
      directory: './torrent-client/public'
    }
  }
}
