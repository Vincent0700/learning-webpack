class HelloPlugin {
  // 在构造函数中获取用户给该插件传入的配置
  constructor(options) {
    this.options = options;
  }
  // Webpack 会调用 HelloPlugin 实例的 apply 方法给插件实例传入 compiler 对象
  apply(compiler) {
    compiler.hooks.run.tap('MyPlugin', () => console.log('开始编译...'));
    compiler.hooks.compile.tap('MyPlugin', async () => {
      await new Promise((resolve) =>
        setTimeout(() => {
          console.log('编译中...');
          resolve();
        }, 1000)
      );
    });
  }
}

module.exports = HelloPlugin;
