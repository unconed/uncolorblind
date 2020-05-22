var path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    index: './src/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/build'),
    filename: '[name].bundle.js'
  },
};
