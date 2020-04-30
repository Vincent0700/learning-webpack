const path = require('path');
const PATH_DIST = path.join(__dirname, '../../dist');
const PATH_TARGET = path.join(__dirname, '../templates');

module.exports = {
  mode: 'development',
  entry: {
    index: path.join(PATH_TARGET, 'index.js'),
    utils: path.join(PATH_TARGET, 'utils.js')
  },
  output: {
    path: PATH_DIST,
    filename: '[name].bundle.js'
  }
};
