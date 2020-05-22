var path = require('path');

module.exports = {
  mode: process.env.NODE_ENVT || 'development',
  entry: {
    index: './src/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/build'),
    filename: '[name].bundle.js'
  },
};
