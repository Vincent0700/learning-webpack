const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/loaders/test-my.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.my$/,
        use: [
          {
            loader: path.join(__dirname, '../loaders/my-loader'),
            options: {
              age: 12
            }
          }
        ]
      }
    ]
  }
};
