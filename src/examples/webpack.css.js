const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/loaders/test-css.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle-css.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
