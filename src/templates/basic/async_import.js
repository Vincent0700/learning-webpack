setTimeout(async () => {
  const utils = await import(/* webpackChunkName: "utils" */ './utils');
  const hello = await import(/* webpackChunkName: "hello" */ './hello');
  console.log(utils);
  console.log(hello);
}, 3000)