const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/basic/async_import.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: '[name].js'
  },
  plugins: [new HtmlWebpackPlugin(), new FriendlyErrorsWebpackPlugin()],
  devServer: {
    contentBase: path.join(__dirname, '../../dist'),
    compress: true,
    port: 9000
  }
};
