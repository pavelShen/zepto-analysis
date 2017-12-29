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
  - [contains](#contains)
  - [className](#classname)
  - [deserializeValue](#deserializevalue)
  - [isNumeric](#isnumeric)
  - [map](#map)
  - [each](#each)

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

### contains
```javascript
// contains的polyfill
$.contains = document.documentElement.contains ?
  function(parent, node) {
    return parent !== node && parent.contains(node)
  } :
  function(parent, node) {
    while (node && (node = node.parentNode))
      if (node === parent) return true
    return false
  }
```

### className
```javascript
// 设置class，对svg做特殊处理
// baseVal 在svg动画生效之前设置和修改属性的基础值
function className(node, value){
  var klass = node.className || '',
      svg   = klass && klass.baseVal !== undefined

  if (value === undefined) return svg ? klass.baseVal : klass
  svg ? (klass.baseVal = value) : (node.className = value)
}
```

### deserializeValue
data函数中会使用，因为html上只能获取字符串，所以对html上获取的字符串做转义
```javascript
// "true"  => true
// "false" => false
// "null"  => null
// "42"    => 42
// "42.5"  => 42.5
// "08"    => "08"
// JSON    => parse if valid
// String  => self
function deserializeValue(value) {
  try {
    return value ?
      value == "true" ||
      ( value == "false" ? false :
        value == "null" ? null :
        +value + "" == value ? +value :
        /^[\[\{]/.test(value) ? $.parseJSON(value) :
        value )
      : value
  } catch(e) {
    return value
  }
}
```

### isNumeric
```javascript
$.isNumeric = function(val) {
  // num = val转义
  var num = Number(val), type = typeof val
  // 满足以下所有条件，返回true
  // val非null
  // 非boolean值 $.isNumeric(true)
  // 非字符串，
  // 如果是字符串，则能通过Number转义成数字
  // 转义后非NaN
  // 非无穷数
  return val != null && type != 'boolean' &&
    (type != 'string' || val.length) &&
    !isNaN(num) && isFinite(num) || false
}
```

### map
```javascript
// 遍历类数组或者对象
// 所有值执行回调函数
// 如果不等于null,则存入临时数组
// 将临时数组flatten并返回
// 不理解为啥要flatten

$.map = function(elements, callback){
  var value, values = [], i, key
  if (likeArray(elements))
    for (i = 0; i < elements.length; i++) {
      value = callback(elements[i], i)
      if (value != null) values.push(value)
    }
  else
    for (key in elements) {
      value = callback(elements[key], key)
      if (value != null) values.push(value)
    }
  return flatten(values)
}

// x:[1,2,3,4,5]
var x = $.map([1,2,3,[4,5]],function(item,index){
 return item
})
```

### each
```javascript
// 返回值始终为elements
// 只执行回调函数，不修改原始引用
// 糊里糊涂的测试了下push，死循环了/(ㄒoㄒ)/~~
$.each = function(elements, callback){
  var i, key
  if (likeArray(elements)) {
    for (i = 0; i < elements.length; i++)
      if (callback.call(elements[i], i, elements[i]) === false) return elements
  } else {
    for (key in elements)
      if (callback.call(elements[key], key, elements[key]) === false) return elements
  }

  return elements
}
```