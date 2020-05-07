# Webpack 模块化原理

> 本文旨在通过分析 Webpack 打包后代码的方式来探索其模块化原理。

## 示例源码

```bash
$ git clone https://github.com/Vincent0700/learning-webpack.git
$ cd learning-webpack
$ yarn install
$ yarn build:basic
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
// src/templates/basic/index.js
import utils from './utils';

const result = utils.add(1, 2);
console.log(result);
```

### Webpack 配置

```javascript
// src/examples/webpack.basic.js
const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/index.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle.js'
  }
};
```

## 打包结果

我格式化并删减了一写注释，得到的 `bundle.js` 文件内容如下：

```javascript
(function(modules) {
  // webpackBootstrap
  // The module cache
  var installedModules = {};

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

  // Load entry module and return exports
  return __webpack_require__((__webpack_require__.s = './src/templates/index.js'));
})({
  './src/templates/index.js':
    /*! ./src/templates/index.js */
    function(module, __webpack_exports__, __webpack_require__) {
      'use strict';
      eval(`
        __webpack_require__.r(__webpack_exports__);
        var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/templates/utils.js");
        const result = _utils__WEBPACK_IMPORTED_MODULE_0__["default"].add(1, 2);
        console.log(result);
      `);
    },

  './src/templates/utils.js':
    /*! ./src/templates/utils.js */
    function(module, __webpack_exports__, __webpack_require__) {
      'use strict';
      eval(`
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
        __webpack_require__.d(__webpack_exports__, "num", function() { return num; });
        __webpack_require__.d(__webpack_exports__, "obj", function() { return obj; });
        const add = (x, y) => x + y;
        const num = 10;
        const obj = { a: { b: 1 } };
        __webpack_exports__["default"] = ({ add, num, obj });
      `);
    }
});
```

## 源码分析

### `IFFE`

打包后的整体就是一个立即执行函数，精简结构如下：

```javascript
(function(modules) {
  var installedModules = {};
  function __webpack_require__(moduleId) {
    // add some magic ...
    return module.exports;
  }
  return __webpack_require__('index.js');
})({
  'index.js': function(module, __webpack_exports__, __webpack_require__) {
    eval('...');
  },
  'utils.js': function(module, __webpack_exports__, __webpack_require__) {
    eval('...');
  }
});
```

### 核心函数 `__webpack_require__`

```javascript
function __webpack_require__(moduleId) {
  // 如果缓存了已装载的模块，则不重复执行，直接返回导出的引用
  if (installedModules[moduleId]) {
    return installedModules[moduleId].exports;
  }
  // 缓存没命中则构建模块
  var module = (installedModules[moduleId] = {
    i: moduleId,
    l: false,
    exports: {}
  });
  // 执行模块
  modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
  // 模块装载标志
  module.l = true;
  // 返回导出的引用
  return module.exports;
}
```

从上述代码可以看出：

1. 模块代码只执行一次，缓存在 `modules[moduleId]`
2. 模块执行后导出对象会挂在 `module.exports` 并返回

我们来看看 `module` 对象

```javascript
// index.js
{
  i: "./src/templates/index.js",
  l: true
  exports: {
    Symbol.toStringTag: "Module",
    __esModule: true
  }
}
```

```javascript
// utils.js
{
  i: "./src/templates/utils.js"
  l: true
  exports: {
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
    minus: (x, y) => x - y,
    multiply: (x, y) => x * y,
    default: {
      add: (x, y) => x + y,
      divide: (x, y) => x / y,
      minus: (x, y) => x - y,
      multiply: (x, y) => x * y
    },
    Symbol.toStringTag: "Module",
    __esModule: true
  }
}
```

从上述代码可以看出：

1. `module.i` 即 `moduleId`，为模块的相对路径
2. `module.l` 将会在模块代码执行后置为 `true`
3. `export { a }` 将会转化为 `module.exports.a`
4. `export default b` 将会转化为 `module.exports.b`
5. `Symbol.toStringTag` 是一个内置 `symbol`，使得我们可以通过 `Object.prototype.toString(module)` 得到 `[object Module]` 以推断类型
6. `__esModule` 标志了这是一个符合 `ES` 标准的模块

### 参数部分

最后研究一下，`IFFE` 的参数部分，即模块代码的编译结果：

```javascript
{
  './src/templates/index.js':
    function(module, __webpack_exports__, __webpack_require__) {
      'use strict';
      eval(`
        __webpack_require__.r(__webpack_exports__);
        var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/templates/utils.js");
        const result = _utils__WEBPACK_IMPORTED_MODULE_0__["default"].add(1, 2);
        console.log(result);
      `);
    },
  './src/templates/utils.js':
    function(module, __webpack_exports__, __webpack_require__) {
      'use strict';
      eval(`
        __webpack_require__.r(__webpack_exports__);
        __webpack_require__.d(__webpack_exports__, "add", function() { return add; });
        __webpack_require__.d(__webpack_exports__, "num", function() { return num; });
        __webpack_require__.d(__webpack_exports__, "obj", function() { return obj; });
        const add = (x, y) => x + y;
        const num = 10;
        const obj = { a: { b: 1 } };
        __webpack_exports__["default"] = ({ add, num, obj });
      `);
    }
}
```

代码分析：

1. `__webpack_exports__` 即执行前初始化的 `module.export = {}`，在代码执行时传入，执行后赋以用 `export` 和 `export default` 导出的值或对象
2. `__webpack_require__.r` 函数定义了 `module.exports.__esModule = true`
3. `__webpack_require__.d` 函数即在 `module.exports` 上定义导出的变量
4. `export default obj` 将会转化为 `module.exports.default = obj`
5. `import utils from './utils'` 将会通过 `__webpack_require__` 导入，根据前面的分析可以得出，模块代码执行的顺序应该是从入口点开始，`import` 的顺序，如果有嵌套引入，则会根据执行嵌套的顺序依次执行后标记引入。
6. 和 `commonjs` 不同，`import` 导入的变量是值的引用
