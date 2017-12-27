<!-- TOC -->

- [内部函数](#内部函数)
  - [isPlainObject](#isplainobject)
  - [likeArray](#likearray)
  - [flatten](#flatten)
    - [没搞懂$.fn.concat.apply([], array) 和直接返回 array 有毛区别](#没搞懂fnconcatapply-array-和直接返回-array-有毛区别)
  - [dasherize](#dasherize)
  - [uniq](#uniq)
  - [classRE](#classre)
  - [defaultDisplay](#defaultdisplay)

<!-- /TOC -->

## 内部函数

### isPlainObject
```javascript
// 类型是对象
// 非window对象
// 通过Object直接构造出
function isPlainObject(obj) {
  return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
}
```

### likeArray
```javascript
// type为object的参数是否为类数组:
// 传入的对象不能是方法
// 不能是window对象
// 类型是数组 || 长度是0 || (长度的类型是数字 && 长度大于0 && 对象上有0这个属性)

function likeArray(obj) {
  var length = !!obj && 'length' in obj && obj.length,
    type = $.type(obj)

  return 'function' != type && !isWindow(obj) && (
    'array' == type || length === 0 ||
      (typeof length == 'number' && length > 0 && (length - 1) in obj)
  )
}
```

### flatten
#### 没搞懂$.fn.concat.apply([], array) 和直接返回 array 有毛区别
```javascript
// 如果数组有内容
// 调用concat的原型方法，铺平一层
// 注：这里使用的是apply方法，所以args是数组内一个个传递过去的
function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
```

### dasherize
```javascript
// 驼峰转中划线-》处理样式的属性
function dasherize(str) {
  return str.replace(/::/g, '/')
          .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
          .replace(/([a-z\d])([A-Z])/g, '$1_$2')
          .replace(/_/g, '-')
          .toLowerCase()
}
```

### uniq
```javascript
// 一个很简单的去重，竟然半天没反应过来
uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }
```

### classRE
```javascript
// 返回一个class匹配的正则
function classRE(name) {
  return name in classCache ?
    classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
}
```

### defaultDisplay
```javascript
// elementDisplay 标签默认display值缓存
// 创建个同tag元素，
// 如果默认值是none的话，则设置默认值为block
// 存入缓存中
function defaultDisplay(nodeName) {
  var element, display
  if (!elementDisplay[nodeName]) {
    element = document.createElement(nodeName)
    document.body.appendChild(element)
    display = getComputedStyle(element, '').getPropertyValue("display")
    element.parentNode.removeChild(element)
    display == "none" && (display = "block")
    elementDisplay[nodeName] = display
  }
  return elementDisplay[nodeName]
}
```