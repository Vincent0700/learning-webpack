# Webpack Loader 原理学习之 css-loader

本文通过 `css-loader` 打包后代码分析了其工作原理，以及相关使用细节。如果对 `Webpack` 模块化原理不熟悉的童鞋可以参考我上一篇文章 [Webpack 模块化原理](./Webpack模块化原理.md)。

## 示例源码

我们依旧从打包后的源码开始看起。

```bash
$ git clone https://github.com/Vincent0700/learning-webpack.git
$ cd learning-webpack
$ yarn install
# 运行
$ yarn dev:css
# 打包
$ yarn build:css
```

### 待打包文件

```css
/* src/templates/loaders/test.css */
html,
body {
  background: #ccc;
  height: 100vh;
}

h1 {
  font-size: 100px;
}
```

```javascript
// src/templates/loaders/test-css.js
import style from './test.css';
console.log(style);
```

### Webpack 配置

```javascript
// src/examples/webpack.css.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/loaders/test-css.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle-css.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['css-loader']
      }
    ]
  },
  plugins: [new HtmlWebpackPlugin()],
  devServer: {
    contentBase: path.join(__dirname, '../../dist'),
    compress: true,
    port: 9000
  }
};
```

## 打包结果

打包后得到了 `bundle-css.js`，其中有 `modules` 有 3 个：

1. ./node_modules/css-loader/dist/runtime/api.js
2. ./src/templates/loaders/test-css.js
3. './src/templates/loaders/test.css'

我们从入口 test-css.js 看起

```javascript
// ./src/templates/loaders/test-css.js'
function(module, __webpack_exports__, __webpack_require__) {
  __webpack_require__.r(__webpack_exports__);
  var _test_css__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
    './src/templates/loaders/test.css'
  );
  var _test_css__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(
    _test_css__WEBPACK_IMPORTED_MODULE_0__
  );
  console.log(_test_css__WEBPACK_IMPORTED_MODULE_0___default.a);
},
```

这段代码首先调用 `__webpack_require__` 读取 `css` 模块，然后是一段兼容性代码，`__webpack_require__.n`，它的作用是判断是否是 `es6` 模块，如果是导出 `module.default`，否则直接导出 `module`，代码如下：

```javascript
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
```

接着，我们看下 `css` 模块的代码：

```javascript
// ./src/templates/loaders/test.css'
var ___CSS_LOADER_API_IMPORT___ = __webpack_require__(
  './node_modules/css-loader/dist/runtime/api.js'
);
exports = ___CSS_LOADER_API_IMPORT___(false);
exports.push([
  module.i,
  `html,body {
    background: #ccc;
    height: 100vh;
  }
  h1 {
    font-size: 100px;
  }`,
  ''
]);
module.exports = exports;
```

这段代码首先通过调用 `api.js` 初始化了 `exports` 并然后导出了 `css` 样式代码，下面我们看看 `api.js` 做了那些事：

```javascript
// ./node_modules/css-loader/dist/runtime/api.js
function(module, exports, __webpack_require__) {
  module.exports = function(useSourceMap) {
    var list = [];
    list.toString = function toString() {
      return this.map(function(item) {
        var content = cssWithMappingToString(item, useSourceMap);
        if (item[2]) {
          return '@media '.concat(item[2], ' {').concat(content, '}');
        }
        return content;
      }).join('');
    };
    list.i = function(modules, mediaQuery, dedupe) {
      if (typeof modules === 'string') {
        modules = [[null, modules, '']];
      }
      var alreadyImportedModules = {};
      if (dedupe) {
        for (var i = 0; i < this.length; i++) {
          var id = this[i][0];
          if (id != null) {
            alreadyImportedModules[id] = true;
          }
        }
      }
      for (var _i = 0; _i < modules.length; _i++) {
        var item = [].concat(modules[_i]);
        if (dedupe && alreadyImportedModules[item[0]]) {
          continue;
        }
        if (mediaQuery) {
          if (!item[2]) {
            item[2] = mediaQuery;
          } else {
            item[2] = ''.concat(mediaQuery, ' and ').concat(item[2]);
          }
        }
        list.push(item);
      }
    };
    return list;
  };

  function cssWithMappingToString(item, useSourceMap) {
    var content = item[1] || '';
    var cssMapping = item[3];
    if (!cssMapping) {
      return content;
    }
    if (useSourceMap && typeof btoa === 'function') {
      var sourceMapping = toComment(cssMapping);
      var sourceURLs = cssMapping.sources.map(function(source) {
        return '/*# sourceURL='.concat(cssMapping.sourceRoot || '').concat(source, ' */');
      });
      return [content]
        .concat(sourceURLs)
        .concat([sourceMapping])
        .join('\n');
    }
    return [content].join('\n');
  }

  function toComment(sourceMap) {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
    var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,'.concat(base64);
    return '/*# '.concat(data, ' */');
  }
}
```

上面代码可以看出 `css-loader` 主要提供了 `toString` 方法，将 `css` 文件导出为字符串。 若传入的 `useSourceMap` 为 `true`，则会生成并添加 `sourcemap` 到导出的字符串。默认不会生成 `sourcemap`，从导出后的代码 `exports = ___CSS_LOADER_API_IMPORT___(false);` 就可以看出。我们改动一下 `test-css.js`：

```javascript
import style from './test.css';
console.log(style.toString());
```

输出的结果为：

```javascript
html,
body {
  background: #ccc;
  height: 100vh;
}

h1 {
  font-size: 100px;
}
```

现在我们改动一下 `webpack`，让 `css-loader` 生成 `sourcemap`：

```javascript
use: [
  {
    loader: 'css-loader',
    options: {
      sourceMap: true
    }
  }
];
```

现在 `toString` 输出的结果为：

```javascript
html,
body {
  background: #ccc;
  height: 100vh;
}

h1 {
  font-size: 100px;
}

/*# sourceURL=test.css */
/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztFQUVFLGdCQUFnQjtFQUNoQixhQUFhO0FBQ2Y7O0FBRUE7RUFDRSxnQkFBZ0I7QUFDbEIiLCJmaWxlIjoidGVzdC5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyJodG1sLFxuYm9keSB7XG4gIGJhY2tncm91bmQ6ICNjY2M7XG4gIGhlaWdodDogMTAwdmg7XG59XG5cbmgxIHtcbiAgZm9udC1zaXplOiAxMDBweDtcbn1cbiJdfQ== */
```

可以看出，现在内联了 `base64` 编码的 `json` 格式的 `sourcemap`，转码后是这样的：

```json
{
  "version": 3,
  "sources": ["test.css"],
  "names": [],
  "mappings": "AAAA;;EAEE,gBAAgB;EAChB,aAAa;AACf;;AAEA;EACE,gBAAgB;AAClB",
  "file": "test.css",
  "sourcesContent": [
    "html,\nbody {\n  background: #ccc;\n  height: 100vh;\n}\n\nh1 {\n  font-size: 100px;\n}\n"
  ]
}
```

## 使用样式

目前虽然可以通过 `import` 导入 `css` 文件了，但是 `html` 还没有套用我们引入的样式。常用的可以衔接 `css-loader` 套用样式到 `html` 的方法有两种：

1. style-loader
2. mini-css-extract-plugin

首先是 `style-loader`，我们简单改动一下 `webpack` 配置：

```javascript
{
  test: /\.css$/,
  use: ['style-loader', 'css-loader']
}
```

可以看出，`loader` 是从右向左加载的。打包后，我们会发现源码中新增了一个 `module`：

```javascript
// ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js
function(module, exports, __webpack_require__) {
  var isOldIE = (function isOldIE() {
    var memo;
    return function memorize() {
      if (typeof memo === 'undefined') {
        memo = Boolean(window && document && document.all && !window.atob);
      }
      return memo;
    };
  })();

  var getTarget = (function getTarget() {
    var memo = {};
    return function memorize(target) {
      if (typeof memo[target] === 'undefined') {
        var styleTarget = document.querySelector(target);
        if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
          try {
            styleTarget = styleTarget.contentDocument.head;
          } catch (e) {
            styleTarget = null;
          }
        }
        memo[target] = styleTarget;
      }
      return memo[target];
    };
  })();

  var stylesInDom = [];
  function getIndexByIdentifier(identifier) {
    var result = -1;
    for (var i = 0; i < stylesInDom.length; i++) {
      if (stylesInDom[i].identifier === identifier) {
        result = i;
        break;
      }
    }
    return result;
  }

  function modulesToDom(list, options) {
    var idCountMap = {};
    var identifiers = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var id = options.base ? item[0] + options.base : item[0];
      var count = idCountMap[id] || 0;
      var identifier = ''.concat(id, ' ').concat(count);
      dCountMap[id] = count + 1;
      var index = getIndexByIdentifier(identifier);
      var obj = {
        css: item[1],
        media: item[2],
        sourceMap: item[3]
      };
      if (index !== -1) {
        stylesInDom[index].references++;
        stylesInDom[index].updater(obj);
      } else {
        stylesInDom.push({
          identifier: identifier,
          updater: addStyle(obj, options),
          references: 1
        });
      }
      identifiers.push(identifier);
    }
    return identifiers;
  }

  function insertStyleElement(options) {
    var style = document.createElement('style');
    var attributes = options.attributes || {};
    if (typeof attributes.nonce === 'undefined') {
      var nonce = true ? __webpack_require__.nc : undefined;
      if (nonce) {
        attributes.nonce = nonce;
      }
    }
    Object.keys(attributes).forEach(function(key) {
      style.setAttribute(key, attributes[key]);
    });
    if (typeof options.insert === 'function') {
      options.insert(style);
    } else {
      var target = getTarget(options.insert || 'head');
      if (!target) {
        throw new Error(
          "Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid."
        );
      }
      target.appendChild(style);
    }
    return style;
  }

  function removeStyleElement(style) {
    if (style.parentNode === null) {
      return false;
    }
    style.parentNode.removeChild(style);
  }

  var replaceText = (function replaceText() {
    textStore = [];
    return function replace(index, replacement) {
      textStore[index] = replacement;
      return textStore.filter(Boolean).join('\n');
    };
  })();

  function applyToSingletonTag(style, index, remove, obj) {
    var css = remove
      ? ''
      : obj.media
      ? '@media '.concat(obj.media, ' {').concat(obj.css, '}')
      : obj.css;
    if (style.styleSheet) {
      style.styleSheet.cssText = replaceText(index, css);
    } else {
      var cssNode = document.createTextNode(css);
      var childNodes = style.childNodes;
      if (childNodes[index]) {
        style.removeChild(childNodes[index]);
      }
      if (childNodes.length) {
        style.insertBefore(cssNode, childNodes[index]);
      } else {
        style.appendChild(cssNode);
      }
    }
  }

  function applyToTag(style, options, obj) {
    var css = obj.css;
    var media = obj.media;
    var sourceMap = obj.sourceMap;
    if (media) {
      style.setAttribute('media', media);
    } else {
      style.removeAttribute('media');
    }
    if (sourceMap && btoa) {
      css += '\n/*# sourceMappingURL=data:application/json;base64,'.concat(
        btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))),
        ' */'
      );
    }
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      while (style.firstChild) {
        style.removeChild(style.firstChild);
      }
      style.appendChild(document.createTextNode(css));
    }
  }

  var singleton = null;
  var singletonCounter = 0;
  function addStyle(obj, options) {
    var style;
    var update;
    var remove;
    if (options.singleton) {
      var styleIndex = singletonCounter++;
      style = singleton || (singleton = insertStyleElement(options));
      update = applyToSingletonTag.bind(null, style, styleIndex, false);
      remove = applyToSingletonTag.bind(null, style, styleIndex, true);
    } else {
      style = insertStyleElement(options);
      update = applyToTag.bind(null, style, options);
      remove = function remove() {
        removeStyleElement(style);
      };
    }
    update(obj);
    return function updateStyle(newObj) {
      if (newObj) {
        if (
          newObj.css === obj.css &&
          newObj.media === obj.media &&
          newObj.sourceMap === obj.sourceMap
        ) {
          return;
        }
        update((obj = newObj));
      } else {
        remove();
      }
    };
  }

  module.exports = function(list, options) {
    options = options || {};
    if (!options.singleton && typeof options.singleton !== 'boolean') {
      options.singleton = isOldIE();
    }
    list = list || [];
    var lastIdentifiers = modulesToDom(list, options);
    return function update(newList) {
      newList = newList || [];
      if (Object.prototype.toString.call(newList) !== '[object Array]') {
        return;
      }
      for (var i = 0; i < lastIdentifiers.length; i++) {
        var identifier = lastIdentifiers[i];
        var index = getIndexByIdentifier(identifier);
        stylesInDom[index].references--;
      }
      var newLastIdentifiers = modulesToDom(newList, options);
      for (var _i = 0; _i < lastIdentifiers.length; _i++) {
        var _identifier = lastIdentifiers[_i];
        var _index = getIndexByIdentifier(_identifier);
        if (stylesInDom[_index].references === 0) {
          stylesInDom[_index].updater();
          stylesInDom.splice(_index, 1);
        }
      }
      lastIdentifiers = newLastIdentifiers;
    };
  };
}
```

分析上述代码可以得知，`style-loader` 暴露了一个方法，传入 `css-loader` 导出的 `list` 和自己的 `options`，主要通过 `insertStyleElement` 这一方法新建 `style` 标签并注入样式。所以这种方式 `css` 是以字符串的形式打包进 `js` 文件的。如果我想要单独导出 `css` 文件，就需要使用 `mini-css-extract-plugin` 了。

我们改动一下 `webpack` 配置：

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/loaders/test-css.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle-css.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          // 'style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, '../../dist'),
    compress: true,
    port: 9000
  }
};
```

`mini-css-extract-plugin` 会从 `bundle` 包中抽出 `css` 文件，然后通过 `link` 标签引入外部样式。我们还可以通过 `optimize-css-assets-webpack-plugin` 对 `css` 文件进行压缩：

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, '../templates/loaders/test-css.js'),
  output: {
    path: path.join(__dirname, '../../dist'),
    filename: 'bundle-css.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          // 'style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    }),
    new OptimizeCssAssetsPlugin()
  ],
  devServer: {
    contentBase: path.join(__dirname, '../../dist'),
    compress: true,
    port: 9000
  }
};
```

## 相关文档

- [Webpack 官方文档](https://www.webpackjs.com/loaders/css-loader/)
