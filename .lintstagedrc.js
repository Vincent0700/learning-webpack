module.exports = {
  '*.js': ['eslint --fix'],
  '*.{md,html,json}': ['prettier --write'],
  '*.{css,scss,less}': ['prettier --write']
};
