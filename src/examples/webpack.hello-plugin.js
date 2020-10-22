const path = require('path');
const HelloPlugin = require('../plugins/hello-plugin.js');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/basic/index.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle.js'
  },
  plugins: [
    new HelloPlugin({
      flag: true
    })
  ]
};
