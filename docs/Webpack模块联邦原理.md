# Webpack5 模块联邦原理

这两天把玩了新玩具 Webpack5，模块联邦的新特性让我眼前一亮，下面用我自己实验的例子逐行代码跟踪调试。

## 案例

这里有 `app1` 和 `app2` 两个完全独立的项目，`app1` 暴露了一个模块 `say` 出去，然后 `app2` 想要去调用它。如果用一般的思维，我们会讲这个 `say` 模块抽成一个公共的包，通过 npm 去共享。但是一旦该模块更新，所有引用这个包的位置也需要 `npm install`。Webpack v5 提供了一种让代码直接在 CDN 中共享的机制，从而不再需要本地安装 npm 包、构建再发布了。我精简后的代码如下：

```js
// app1/webpack.config.js
module.exports = {
  ...
  plugins: [
    new ModuleFederationPlugin({
      name: "app1",
      library: { type: "var", name: "app1" },
      filename: "remoteEntry.js",
      exposes: {
        './say': path.join(__dirname, './say.js')
      }
    })
  ]
};
```

```js
// app2/webpack.config.js
module.exports = {
  ...
  plugins: [
    new ModuleFederationPlugin({
      name: "app2",
      library: { type: "var", name: "app2" },
      remotes: {
        app1: "app1",
      }
    })
  ]
};
```

```html
<!-- app2/index.html -->
<script src="http://127.0.0.1:2001/remoteEntry.js"></script>
```

```js
// app2/index.js
const remoteSay = import('app1/say');
remoteSay.then(({ say }) => {
  say('app2');
});
```

可以看到，通过引如 `app1` 中定义的远程模块入口文件 `remoteEntry.js` 之后，我们就能够在代码中通过异步模块的方式使用了。

## 异步模块原理

我们复习下 Webpack v4 中的异步模块的原理：

1. `import(chunkId) => __webpack_require__.e(chunkId)`
   将相关的请求回调存入 `installedChunks`。

```js
// import(chunkId) => __webpack_require__.e(chunkId)
__webpack_require__.e = function(chunkId) {
  return new Promise((resolve, reject) => {
    var script = document.createElement('script');
    script.src = jsonpScriptSrc(chunkId);
    var onScriptComplete = function(event) {
      // ...
    };
    var timeout = setTimeout(function() {
      onScriptComplete({ type: 'timeout', target: script });
    }, 120000);
    script.onerror = script.onload = onScriptComplete;
    document.head.appendChild(script);
  });
};
```

2. 发起 JSONP 请求
3. 将下载的模块录入 modules
4. 执行 chunk 请求回调
5. 加载 module
6. 执行用户回调

## 模块联邦实现原理

首先看 `app2` 打包后的代码，我精简了一下，大致结构如下

```js
// 最外层是一个 IIFE
(() => {
  var __webpack_modules__ = {
    'webpack/container/reference/app1':
      /*!***********************!*\
        !*** external "app1" ***!
        \***********************/
      (module) => {
        'use strict';
        module.exports = app1;
      }
  };

  // 定义模块缓存
  var __webpack_module_cache__ = {};

  // 定义 __webpack_require__
  function __webpack_require__(moduleId) {
    // 尝试从缓存读取模块
    if (__webpack_module_cache__[moduleId]) {
      return __webpack_module_cache__[moduleId].exports;
    }
    // 创建模块缓存
    var module = (__webpack_module_cache__[moduleId] = {
      exports: {}
    });

    // 执行模块回调，从这里可以看出，模块的回调方法存在 __webpack_modules__ 里
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);

    // 返回模块 exports
    return module.exports;
  }

  // 一些 webpack runtime 方法 ...

  // 底部是本地 app2 的模块代码
  (() => {
    /*!********************************!*\
      !*** ./examples/app2/index.js ***!
      \********************************/
    const remoteSay = __webpack_require__
      .e('webpack_container_remote_app1_say')
      .then(
        __webpack_require__.t.bind(__webpack_require__, 'webpack/container/remote/app1/say', 7)
      );
    remoteSay.then(({ say }) => {
      say('app2');
    });
  })();
})();
```

我们可以看到相比于 Webpack v4，打包后代码结构上的变化。首先，在最顶部会暴露依赖的远程模块的入口点，接着 **webpack_require** 的定义没有什么变化，再下面是一堆 runtime 方法。最底部是我们的模块代码。

我们原本的

```js
const remoteSay = import('app1/say');
```

被替换成了

```js
const remoteSay = __webpack_require__
  .e('webpack_container_remote_app1_say')
  .then(__webpack_require__.t.bind(__webpack_require__, 'webpack/container/remote/app1/say', 7));
```

我们切到 `remoteSay` 定义的这一行断点调试，首先是 `__webpack_require__.e` 方法:

```js
/* webpack/runtime/ensure chunk */
(() => {
  __webpack_require__.f = {};
  __webpack_require__.e = (chunkId) => {
    return Promise.all(
      Object.keys(__webpack_require__.f).reduce((promises, key) => {
        __webpack_require__.f[key](chunkId, promises);
        return promises;
      }, [])
    );
  };
})();
```

这里，`chunkId` 是 `webpack_container_remote_app1_say`，也就是我们在 `app1` 中暴露的远程模块。**webpack_require**.f 上有两个对象，remotes 和 j，定义如下：

```js
// 这里 f.j 方法应该只是把指定的 chunk 标记为已安装
__webpack_require__.f.j = (chunkId, promises) => {
  installedChunks[chunkId] = 0;
};
// 重点在 f.remotes 上
var chunkMapping = {
  webpack_container_remote_app1_say: ['webpack/container/remote/app1/say']
};
var idToExternalAndNameMapping = {
  'webpack/container/remote/app1/say': ['default', './say', 'webpack/container/reference/app1']
};
__webpack_require__.f.remotes = (chunkId, promises) => {
  // __webpack_require__.o => hasOwnProperty
  if (__webpack_require__.o(chunkMapping, chunkId)) {
    chunkMapping[chunkId].forEach((id) => {
      var getScope = __webpack_require__.R;
      if (!getScope) getScope = [];
      var data = idToExternalAndNameMapping[id];
      if (getScope.indexOf(data) >= 0) return;
      // getScope = data = ['default', './say', 'webpack/container/reference/app1']
      getScope.push(data);
      if (data.p) return promises.push(data.p);
      var onError = (error) => {
        if (!error) error = new Error('Container missing');
        if (typeof error.message === 'string')
          error.message += '\nwhile loading "' + data[1] + '" from ' + data[2];
        __webpack_modules__[id] = () => {
          throw error;
        };
        data.p = 0;
      };
      var handleFunction = (fn, arg1, arg2, d, next, first) => {
        /**
         * fn: __webpack_require__
         * arg1: 'webpack/container/reference/app1'
         * arg2: 0
         * d: 0
         * next: onExternal
         * first: 1
         */
        try {
          // __webpack_require__('webpack/container/reference/app1', 0)
          // 这里会加载模块最顶部导出的从 remoteEntry 暴露出来的 app1 模块
          var promise = fn(arg1, arg2);
          // 由于返回的结果不是 promise，直接调到 else
          if (promise && promise.then) {
            var p = promise.then((result) => next(result, d), onError);
            if (first) promises.push((data.p = p));
            else return p;
          } else {
            // 调用 onExternal(app1, 0, 1)
            return next(promise, d, first);
          }
        } catch (error) {
          onError(error);
        }
      };
      var onExternal = (external, _, first) =>
        external
          ? handleFunction(__webpack_require__.I, data[0], 0, external, onInitialized, first)
          : onError();
      var onInitialized = (_, external, first) =>
        handleFunction(external.get, data[1], getScope, 0, onFactory, first);
      var onFactory = (factory) => {
        data.p = 1;
        __webpack_modules__[id] = (module) => {
          module.exports = factory();
        };
      };
      handleFunction(__webpack_require__, data[2], 0, 0, onExternal, 1);
    });
  }
};
```

第一次 `handleFunction` 会用 **webpack_require** 读取文件最顶部定义的 `app1` 的 chunk，这个 chunk 最终会导出 `app1` 的入口文件模块 `remoteEntry.js`。

由于 `remoteEntry` 是最先加载的，所以直接返回 `module` 本身而不是 `promise`，所以直接跳到 `else` 执行 `onExternal(app1, 0, 1)`。

第二次执行 `handleFunction`：

```js
var handleFunction = (fn, arg1, arg2, d, next, first) => {
  // __webpack_require__.I('default', 0)
  var promise = fn(arg1, arg2);
  ...
};
```

这里首先调用 **webpack_require**.I('default')，我们看下 I 方法：

```js
/* webpack/runtime/sharing */
(() => {
  __webpack_require__.S = {};
  var initPromises = {};
  var initTokens = {};
  __webpack_require__.I = (name, initScope) => {
    // 初始化 initScope 对象
    if (!initScope) initScope = [];
    // 解决 init 方法循环调用的问题，如果初始化过 initScope，则直接从缓存中读取
    var initToken = initTokens[name];
    if (!initToken) initToken = initTokens[name] = {};
    if (initScope.indexOf(initToken) >= 0) return;
    initScope.push(initToken);
    // 处理异步 init 方法
    if (initPromises[name]) return initPromises[name];
    // 收集 init 方法的调用依赖，挂在 __webpack_require__.S 上，如果没有则新建空对象
    if (!__webpack_require__.o(__webpack_require__.S, name)) __webpack_require__.S[name] = {};
    // share scope，即为，init 方法的执行环境
    var scope = __webpack_require__.S[name];
    var warn = (msg) => typeof console !== 'undefined' && console.warn && console.warn(msg);
    // 这个 uniqueName 最终作为全局变量 window[webpackChunk + uniqueName] 作为远程模块回调的缓存
    var uniqueName = 'webpack5-demo';
    var register = (name, version, factory) => {
      var versions = (scope[name] = scope[name] || {});
      var activeVersion = versions[version];
      if (!activeVersion || (!activeVersion.loaded && uniqueName > activeVersion.from))
        versions[version] = { get: factory, from: uniqueName };
    };
    // 初始化外部模块
    var initExternal = (id) => {
      var handleError = (err) => warn('Initialization of sharing external failed: ' + err);
      try {
        // 拿到 app1
        var module = __webpack_require__(id);
        if (!module) return;
        // 重要！调用 app1.init 方法初始化，之前所有收集依赖的步骤都是为了给这里创造执行环境
        var initFn = (module) =>
          module && module.init && module.init(__webpack_require__.S[name], initScope);
        if (module.then) return promises.push(module.then(initFn, handleError));
        var initResult = initFn(module);
        if (initResult && initResult.then) return promises.push(initResult.catch(handleError));
      } catch (err) {
        handleError(err);
      }
    };
    var promises = [];
    switch (name) {
      case 'default':
        {
          initExternal('webpack/container/reference/app1');
        }
        break;
    }
    if (!promises.length) return (initPromises[name] = 1);
    return (initPromises[name] = Promise.all(promises).then(() => (initPromises[name] = 1)));
  };
})();
```

执行完毕后回来调用第三次 `handleFunction`：

```js
var handleFunction = (fn, arg1, arg2, d, next, first) => {
  // app1.get('./say', ['default', './say', 'webpack/container/reference/app1'])
  var promise = fn(arg1, arg2);
  ...
}
```

跳到 `remoteEntry` 的 `app1.get` 方法：

```js
var moduleMap = {
  './say': () => {
    return __webpack_require__
      .e('examples_app1_say_js')
      .then(() => () => __webpack_require__('./examples/app1/say.js'));
  }
};
var get = (module, getScope) => {
  __webpack_require__.R = getScope;
  getScope = __webpack_require__.o(moduleMap, module)
    ? moduleMap[module]()
    : Promise.resolve().then(() => {
        throw new Error('Module "' + module + '" does not exist in container.');
      });
  __webpack_require__.R = undefined;
  return getScope;
};
```

这里在 `moduleMap` 定义了 `./say` 方法所在的异步模块，然后通过 **webpack_require**.e 下载异步模块，加载完之后再调用 **webpack_require** 执行模块回调。看来下载远程模块的代码在 `e` 方法里了：

```js
/* webpack/runtime/ensure chunk */
(() => {
  __webpack_require__.f = {};
  __webpack_require__.e = (chunkId) => {
    return Promise.all(
      Object.keys(__webpack_require__.f).reduce((promises, key) => {
        __webpack_require__.f[key](chunkId, promises);
        return promises;
      }, [])
    );
  };
})();
```

在 **webpack_require**.f 中只有一个 `j` 方法，跳转到 **webpack_require**.f.j：

```js
__webpack_require__.f.j = (chunkId, promises) => {
  var installedChunkData = __webpack_require__.o(installedChunks, chunkId)
    ? installedChunks[chunkId]
    : undefined;
  // installedChunkData 如果等于 0 表明已加载
  if (installedChunkData !== 0) {
    if (installedChunkData) {
      promises.push(installedChunkData[2]);
    } else {
      if (true) {
        // 不太清楚这里的判断啥意思
        // 初始化 Promise
        var promise = new Promise((resolve, reject) => {
          installedChunkData = installedChunks[chunkId] = [resolve, reject];
        });
        promises.push((installedChunkData[2] = promise));
        // 获取 chunk 地址
        var url = __webpack_require__.p + __webpack_require__.u(chunkId);
        var error = new Error();
        var loadingEnded = (event) => {
          if (__webpack_require__.o(installedChunks, chunkId)) {
            installedChunkData = installedChunks[chunkId];
            if (installedChunkData !== 0) installedChunks[chunkId] = undefined;
            if (installedChunkData) {
              var errorType = event && (event.type === 'load' ? 'missing' : event.type);
              var realSrc = event && event.target && event.target.src;
              error.message =
                'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
              error.name = 'ChunkLoadError';
              error.type = errorType;
              error.request = realSrc;
              installedChunkData[1](error);
            }
          }
        };
        // 下载 chunk 脚本
        __webpack_require__.l(url, loadingEnded, 'chunk-' + chunkId);
      } else installedChunks[chunkId] = 0;
    }
  }
};
```

通过 **webpack_require**.l(url, errorHandler, chunkName) 下载脚本：

```js
/* webpack/runtime/load script */
(() => {
  var inProgress = {};
  var dataWebpackPrefix = 'webpack5-demo:';
  // loadScript function to load a script via script tag
  __webpack_require__.l = (url, done, key) => {
    if (inProgress[url]) {
      inProgress[url].push(done);
      return;
    }
    var script, needAttach;
    if (key !== undefined) {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var s = scripts[i];
        if (
          s.getAttribute('src') == url ||
          s.getAttribute('data-webpack') == dataWebpackPrefix + key
        ) {
          script = s;
          break;
        }
      }
    }
    if (!script) {
      needAttach = true;
      // 创建 script 标签
      script = document.createElement('script');

      script.charset = 'utf-8';
      script.timeout = 120;
      if (__webpack_require__.nc) {
        script.setAttribute('nonce', __webpack_require__.nc);
      }
      script.setAttribute('data-webpack', dataWebpackPrefix + key);
      // 设置 src = 'http://127.0.0.1:2001/examples_app1_say_js.bundle.js'
      script.src = url;
      // 到这远程脚本 examples_app1_say_js.bundle.js 应该就开始下载了
    }
    inProgress[url] = [done];
    var onScriptComplete = (prev, event) => {
      // avoid mem leaks in IE.
      script.onerror = script.onload = null;
      clearTimeout(timeout);
      var doneFns = inProgress[url];
      delete inProgress[url];
      script.parentNode && script.parentNode.removeChild(script);
      doneFns && doneFns.forEach((fn) => fn(event));
      if (prev) return prev(event);
    };
    var timeout = setTimeout(
      onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }),
      120000
    );
    script.onerror = onScriptComplete.bind(null, script.onerror);
    script.onload = onScriptComplete.bind(null, script.onload);
    needAttach && document.head.appendChild(script);
  };
})();
```

到此，远程模块已加载完成，后面的事情就与 Webpack v4 一样了。

## 小结

下面总结下远程模块的加载步骤：

1. 下载并执行 `remoteEntry.js`，挂载入口点对象到 `window.app1`，他有两个函数属性，`init` 和 `get`。`init` 方法用于初始化作用域对象 initScope，`get` 方法用于下载 `moduleMap` 中导出的远程模块。
2. 加载 `app1` 到本地模块
3. 创建 `app1.init` 的执行环境，收集依赖到共享作用域对象 `shareScope`
4. 执行 `app1.init`，初始化 `initScope`
5. 用户 `import` 远程模块时调用 `app1.get(moduleName)` 通过 `Jsonp` 懒加载远程模块，然后缓存在全局对象 window['webpackChunk' + appName]
6. 通过 **webpack_require** 读取缓存中的模块，执行用户回调
