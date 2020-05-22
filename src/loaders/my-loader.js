module.exports = function(content) {
  const data = JSON.parse(content);
  if (data.code === 200) {
    const list = data.data;
    return `export default ${JSON.stringify(list)}`;
  }
  return `export default undefined`;
};
