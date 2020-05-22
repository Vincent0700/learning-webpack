# Webpack 动态导入原理

> 本文主要记录了 Webpack import('module').then(...) 动态导入语法的原理，如果对 Webpack 模块化原理不是很了解，可以参考我之前的文章 [Webpack 模块化原理](./Webpack模块化原理.md)

## 示例源码

```bash
$ git clone https://github.com/Vincent0700/learning-webpack.git
$ cd learning-webpack
$ yarn install
# 开发
$ yarn dev:async
# 编译
$ yarn build:async
```

### 待打包文件

```javascript
// src/templates/basic/utils.js
export const add = (x, y) => x + y;
export const num = 10;
export const obj = { a: { b: 1 } };

export default {
  add,
  num,
  obj
};
```

```javascript
// src/templates/basic/hello.js
export default function(name) {
  console.log(`hello ${name}`);
}
```

```javascript
// src/templates/basic/async_import.js
setTimeout(async () => {
  const utils = await import(/* webpackChunkName: "utils" */ './utils');
  const hello = await import(/* webpackChunkName: "hello" */ './hello');
  console.log(utils);
  console.log(hello);
}, 3000);
```

入口文件 `async_import.js` 会在三秒后引入 `utils.js`，从语法可以看出 `import(...)` 的结果是一个 `Promise` 猜测应该是 `Webpack` 的 `module` 对象

### Webpack 配置

```javascript
// src/examples/webpack.async.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/basic/async_import.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: '[name].js'
  },
  plugins: [new HtmlWebpackPlugin(), new FriendlyErrorsWebpackPlugin()],
  devServer: {
    contentBase: path.join(__dirname, '../../dist'),
    compress: true,
    port: 9000
  }
};
```

## 打包结果

我格式化并删减了一写注释，得到的 `utils.js` 内容如下:

```javascript
(window['webpackJsonp'] = window['webpackJsonp'] || []).push([
  ['utils'],
  {
    './src/templates/basic/utils.js': function(module, __webpack_exports__, __webpack_require__) {
      eval(`
      __webpack_require__.r(__webpack_exports__);
      __webpack_require__.d(__webpack_exports__, "add", function() { return add; });__webpack_require__.d(__webpack_exports__, "num", function() { return num; });__webpack_require__.d(__webpack_exports__, "obj", function() { return obj; });
      const add = (x, y) => x + y;
      const num = 10;
      const obj = { a: { b: 1 } };
      __webpack_exports__["default"] = ({ add, num, obj });
    `);
    }
  }
]);
```

得到的 `main.js` 文件内容如下：

```javascript
(function(modules) {
  // webpackBootstrap
  // install a JSONP callback for chunk loading
  function webpackJsonpCallback(data) {
    var chunkIds = data[0];
    var moreModules = data[1];

    // add "moreModules" to the modules object,
    // then flag all "chunkIds" as loaded and fire callback
    var moduleId,
      chunkId,
      i = 0,
      resolves = [];
    for (; i < chunkIds.length; i++) {
      chunkId = chunkIds[i];
      if (
        Object.prototype.hasOwnProperty.call(installedChunks, chunkId) &&
        installedChunks[chunkId]
      ) {
        resolves.push(installedChunks[chunkId][0]);
      }
      installedChunks[chunkId] = 0;
    }
    for (moduleId in moreModules) {
      if (Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
        modules[moduleId] = moreModules[moduleId];
      }
    }
    if (parentJsonpFunction) parentJsonpFunction(data);

    while (resolves.length) {
      resolves.shift()();
    }
  }

  // The module cache
  var installedModules = {};

  // object to store loaded and loading chunks
  // undefined = chunk not loaded, null = chunk preloaded/prefetched
  // Promise = chunk loading, 0 = chunk loaded
  var installedChunks = {
    main: 0
  };

  // script path function
  function jsonpScriptSrc(chunkId) {
    return __webpack_require__.p + '' + ({ utils: 'utils' }[chunkId] || chunkId) + '.js';
  }

  // The require function
  function __webpack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }
    // Create a new module (and put it into the cache)
    var module = (installedModules[moduleId] = {
      i: moduleId,
      l: false,
      exports: {}
    });

    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

    // Flag the module as loaded
    module.l = true;

    // Return the exports of the module
    return module.exports;
  }

  // This file contains only the entry chunk.
  // The chunk loading function for additional chunks
  __webpack_require__.e = function requireEnsure(chunkId) {
    var promises = [];

    // JSONP chunk loading for javascript

    var installedChunkData = installedChunks[chunkId];
    if (installedChunkData !== 0) {
      // 0 means "already installed".

      // a Promise means "currently loading".
      if (installedChunkData) {
        promises.push(installedChunkData[2]);
      } else {
        // setup Promise in chunk cache
        var promise = new Promise(function(resolve, reject) {
          installedChunkData = installedChunks[chunkId] = [resolve, reject];
        });
        promises.push((installedChunkData[2] = promise));

        // start chunk loading
        var script = document.createElement('script');
        var onScriptComplete;

        script.charset = 'utf-8';
        script.timeout = 120;
        if (__webpack_require__.nc) {
          script.setAttribute('nonce', __webpack_require__.nc);
        }
        script.src = jsonpScriptSrc(chunkId);

        // create error before stack unwound to get useful stacktrace later
        var error = new Error();
        onScriptComplete = function(event) {
          // avoid mem leaks in IE.
          script.onerror = script.onload = null;
          clearTimeout(timeout);
          var chunk = installedChunks[chunkId];
          if (chunk !== 0) {
            if (chunk) {
              var errorType = event && (event.type === 'load' ? 'missing' : event.type);
              var realSrc = event && event.target && event.target.src;
              error.message =
                'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
              error.name = 'ChunkLoadError';
              error.type = errorType;
              error.request = realSrc;
              chunk[1](error);
            }
            installedChunks[chunkId] = undefined;
          }
        };
        var timeout = setTimeout(function() {
          onScriptComplete({ type: 'timeout', target: script });
        }, 120000);
        script.onerror = script.onload = onScriptComplete;
        document.head.appendChild(script);
      }
    }
    return Promise.all(promises);
  };

  // expose the modules object (__webpack_modules__)
  __webpack_require__.m = modules;

  // expose the module cache
  __webpack_require__.c = installedModules;

  // define getter function for harmony exports
  __webpack_require__.d = function(exports, name, getter) {
    if (!__webpack_require__.o(exports, name)) {
      Object.defineProperty(exports, name, { enumerable: true, get: getter });
    }
  };

  // define __esModule on exports
  __webpack_require__.r = function(exports) {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    }
    Object.defineProperty(exports, '__esModule', { value: true });
  };

  // create a fake namespace object
  // mode & 1: value is a module id, require it
  // mode & 2: merge all properties of value into the ns
  // mode & 4: return value when already ns object
  // mode & 8|1: behave like require
  __webpack_require__.t = function(value, mode) {
    if (mode & 1) value = __webpack_require__(value);
    if (mode & 8) return value;
    if (mode & 4 && typeof value === 'object' && value && value.__esModule) return value;
    var ns = Object.create(null);
    __webpack_require__.r(ns);
    Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    if (mode & 2 && typeof value != 'string')
      for (var key in value)
        __webpack_require__.d(
          ns,
          key,
          function(key) {
            return value[key];
          }.bind(null, key)
        );
    return ns;
  };

  // getDefaultExport function for compatibility with non-harmony modules
  __webpack_require__.n = function(module) {
    var getter =
      module && module.__esModule
        ? function getDefault() {
            return module['default'];
          }
        : function getModuleExports() {
            return module;
          };
    __webpack_require__.d(getter, 'a', getter);
    return getter;
  };

  // Object.prototype.hasOwnProperty.call
  __webpack_require__.o = function(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
  };

  // __webpack_public_path__
  __webpack_require__.p = '';

  // on error function for async loading
  __webpack_require__.oe = function(err) {
    console.error(err);
    throw err;
  };

  var jsonpArray = (window['webpackJsonp'] = window['webpackJsonp'] || []);
  var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
  jsonpArray.push = webpackJsonpCallback;
  jsonpArray = jsonpArray.slice();
  for (var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
  var parentJsonpFunction = oldJsonpFunction;

  // Load entry module and return exports
  return __webpack_require__((__webpack_require__.s = './src/templates/basic/async_import.js'));
})({
  './src/templates/basic/async_import.js': function(module, exports, __webpack_require__) {
    eval(`
      setTimeout(async () => {
        const utils = await __webpack_require__.e("utils").then(
          __webpack_require__.bind(null, "./src/templates/basic/utils.js")
        );
        console.log(utils);
        const result = utils.add(1, 2);
        console.log(result);
      }, 3000)
    `);
  }
});
```

## 源码分析

从代码中可以发现, `import('utils')` 被翻译成了

```
__webpack_require__.e('utils')
  .then(__webpack_require__.bind(null, './src/templates/basic/utils.js'));
```

从我之前的文章 [Webpack 模块化原理](./Webpack模块化原理.md) 中可以知道 `__webpack_require__(moduleId)` 会先读取缓存，如果缓存没有命中，就会从 `modules` 加载并执行, 现在被嵌入到 `__webpack_require__.e('utils')` 的 `Promise` 回调中, 所以 `__webpack_require__.e('utils')` 应该会异步加载 `utils.js` 到 `modules` 对象, 然后被 `__webpack_require__` 引入执行。

那么 `Webpack` 是如何实现异步加载的呢？我们来看一下 `__webpack_require__.e` 的部分代码：

```javascript
var script = document.createElement('script');
var onScriptComplete;
script.charset = 'utf-8';
script.timeout = 120;
script.src = jsonpScriptSrc(chunkId);

onScriptComplete = function(event) {
  // ...
};

var timeout = setTimeout(function() {
  onScriptComplete({ type: 'timeout', target: script });
}, 120000);

script.onerror = script.onload = onScriptComplete;
document.head.appendChild(script);
```

明白了么？`Webpack` 其实是通过 `jsonp` 的方式来实现模块的动态加载的。下面我们来看看 `chunk` 部分：

```
(window['webpackJsonp'] = window['webpackJsonp'] || []).push([
  ['utils'], {
    './src/templates/basic/utils.js':
    function(module, __webpack_exports__, __webpack_require__) {
      ...
    }
  }
]);
```

不难发现，通过 `script` 引入的模块代码最终会挂载 `window.webpackJsonp` 上，我们看一下这个变量的结构：

```
// webpack.webpackJsonp
[
  0: [
    ["utils"],
    {./src/templates/basic/utils.js: ƒ}
  ],
  1: [
    ["hello"],
    {./src/templates/basic/hello.js: ƒ}
  ],
  push: f webpackJsonpCallback(data)
]
```

我觉得这里 `Webpack` 可能忽视了一个问题，因为这里模块代码是通过全局变量和入口模块进行通信的，就不可避免的会遇变量被污染的情况，我试了下，如果在全局先定义了 `webpackJsonp = 1`，那么后续所有动态引入的模块都无法被加载。

最后我转一张掘金上看到的图，展示 `Webpack` 异步加载的流程，[文章链接](https://juejin.im/post/5d26e7d1518825290726f67a)

![](https://user-gold-cdn.xitu.io/2019/7/12/16be5408cd5fedcb?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)
