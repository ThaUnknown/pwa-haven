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
  externals: {
    anitomyscript: 'anitomyscript'
  },
  resolve: {
    alias: {
      svelte: path.dirname(require.resolve('svelte/package.json'))
    },
    extensions: ['.mjs', '.js', '.svelte'],
    mainFields: ['svelte', 'browser', 'module', 'main']
  },
  output: {
    path: path.join(__dirname, '/public'),
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
    // this one is really weird, it still includes shit that you dont need, but when you specify that you dont need it, it will only include it if its ACTUALLY needed.
    // tldr exclude ALL, loose filesize
    new NodePolyfillPlugin({
      excludeAliases: [
        'assert',
        'buffer',
        'console',
        'constants',
        'crypto',
        'domain',
        'events',
        'http',
        'https',
        'os',
        'path',
        'punycode',
        'process',
        'querystring',
        '_stream_duplex',
        '_stream_passthrough',
        '_stream_readable',
        '_stream_transform',
        '_stream_writable',
        'string_decoder',
        'sys',
        'timers',
        'tty',
        'url',
        'util',
        'vm',
        'zlib'
      ]
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  devtool: 'source-map',
  devServer: {
    hot: true
  }
}
