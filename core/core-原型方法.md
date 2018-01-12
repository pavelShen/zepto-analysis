<!-- TOC -->

- [原型方法](#原型方法)
  - [ready](#ready)
  - [each](#each)
  - [filter](#filter)
  - [not](#not)
  - [has](#has)
  - [find](#find)
  - [closest](#closest)
  - [parents](#parents)
  - [children](#children)
  - [css](#css)
  - [width,height](#widthheight)
  - [after,prepend,before,append,insertAfter,insertBefore,appendTo,prependTo](#afterprependbeforeappendinsertafterinsertbeforeappendtoprependto)

<!-- /TOC -->

## 原型方法

### ready
```javascript
// 回调函数第一个参数为$
// 和src/zepto.js内容不同
ready: function(callback){
  // readyRE = /complete|loaded|interactive/
  // 当document.readyState为complete|loaded|interactive时候 且 document.body存在时，执行回调函数
  // ie下可能在body元素未生成时候，document已经是ready状态
  if (readyRE.test(document.readyState) && document.body) callback($)
  else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
  return this
},
```

### each
```javascript
// 调用every函数
// every 方法为数组中的每个元素执行一次 callback 函数，直到它找到一个使 callback 返回 false（表示可转换为布尔值 false 的值）的元素。如果发现了一个这样的元素，every 方法将会立即返回 false。
each: function(callback){
  emptyArray.every.call(this, function(el, idx){
    return callback.call(el, idx, el) !== false
  })
  return this
},
```

### filter
```javascript
filter: function(selector){
  // 如果传入的是方法，则取not的非
  if (isFunction(selector)) return this.not(this.not(selector))
  return $(filter.call(this, function(element){
    // 匹配到则返回
    return zepto.matches(element, selector)
  }))
},
```

### not
```javascript
not: function(selector){
  var nodes=[]
  if (isFunction(selector) && selector.call !== undefined)
    this.each(function(idx){
      // 元素执行方法后返回false，则将元素放入nodes中，最终返回出去
      if (!selector.call(this,idx)) nodes.push(this)
    })
  else {
    // not需要排除的元素
    var excludes = typeof selector == 'string' ? this.filter(selector) :
      // 如果是nodelist，返回数组化的nodelist
      (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
    this.forEach(function(el){
      // 元素不在excludes中
      if (excludes.indexOf(el) < 0) nodes.push(el)
    })
  }
  return $(nodes)
},
```

### has
```javascript
has: function(selector){
  return this.filter(function(){
    // dom对象 "[object HTMLDivElement]" 因为不在class2type里面，
    // 所以进入保底处理,所以这里也返回true
    return isObject(selector) ?
      // 原生的node节点has的处理
      $.contains(this, selector) :
      // zepto集合has的处理
      $(this).find(selector).size()
  })
},
```

### find
```javascript
find: function(selector){
  var result, $this = this
  // 错误处理，没传selector，返回个空的zepto对象
  if (!selector) result = $()
  // 如果传入的是个原生的dom对象（单个node），使用some查找，只要包含在$this之中，直接返回，不再继续往下查找
  else if (typeof selector == 'object')
    result = $(selector).filter(function(){
      var node = this
      return emptyArray.some.call($this, function(parent){
        return $.contains(parent, node)
      })
    })
  // 父元素只有一个的话，直接通过qsa方法查找子元素
  // maybeClass ? element.getElementsByClassName(nameOnly) : // 如果是class，执行getElementsByClassName
  // element.getElementsByTagName(selector) : // 或者是一个tag
  // element.querySelectorAll(selector) // 复杂元素
  else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
  else result = this.map(function(){ return zepto.qsa(this, selector) })
  return result
},
```

### closest
```javascript
closest: function(selector, context){
  var nodes = [], collection = typeof selector == 'object' && $(selector)
  this.each(function(_, node){
    // 存在node 且 node不会被selector选中（即node和selector不是一个节点） 
    while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
      // node节点上移
      node = node !== context && !isDocument(node) && node.parentNode
    // 如果找到了则push之后返回
    if (node && nodes.indexOf(node) < 0) nodes.push(node)
  })
  return $(nodes)
},
```

### parents
```javascript
parents: function(selector){
  var ancestors = [], nodes = this
  // 遍历this的所有父元素,将所有父元素放入ancestors中
  while (nodes.length > 0)
    nodes = $.map(nodes, function(node){
      if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
        ancestors.push(node)
        return node
      }
    })
  
  // 通过filtered过滤出对应的selector
  return filtered(ancestors, selector)
},
```

### children
```javascript
children: function(selector){
  // 这里的children是内部函数，取的是element.children，所以他只查找一层
  return filtered(this.map(function(){ return children(this) }), selector)
},
```














### css
```javascript
css: function(property, value){
  if (arguments.length < 2) {
    var element = this[0]
    if (typeof property == 'string') {
      if (!element) return
      return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)
    } else if (isArray(property)) {
      if (!element) return
      var props = {}
      var computedStyle = getComputedStyle(element, '')
      $.each(property, function(_, prop){
        props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
      })
      return props
    }
  }

  var css = ''
  if (type(property) == 'string') {
    if (!value && value !== 0)
      this.each(function(){ this.style.removeProperty(dasherize(property)) })
    else
      css = dasherize(property) + ":" + maybeAddPx(property, value)
  } else {
    for (key in property)
      if (!property[key] && property[key] !== 0)
        this.each(function(){ this.style.removeProperty(dasherize(key)) })
      else
        css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
  }

  return this.each(function(){ this.style.cssText += ';' + css })
}
```

### width,height
```javascript
// Generate the `width` and `height` functions
;['width', 'height'].forEach(function(dimension){
  var dimensionProperty =
    dimension.replace(/./, function(m){ return m[0].toUpperCase() })

  $.fn[dimension] = function(value){
    var offset, el = this[0]
    if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
      isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
      (offset = this.offset()) && offset[dimension]
    else return this.each(function(idx){
      el = $(this)
      el.css(dimension, funcArg(this, value, idx, el[dimension]()))
    })
  }
})
```

### after,prepend,before,append,insertAfter,insertBefore,appendTo,prependTo
```javascript
// adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
adjacencyOperators.forEach(function(operator, operatorIndex) {
  // 操作的是元素内部？
  var inside = operatorIndex % 2 //=> prepend, append

  $.fn[operator] = function(){
    // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
    var argType, 
    // nodes => 数组 => node元素集合
    //       => 原生对象 => 原生对象
    //       => 字符串 => $()包一层
        nodes = $.map(arguments, function(arg) {
          var arr = []
          argType = type(arg)
          if (argType == "array") {
            arg.forEach(function(el) {
              if (el.nodeType !== undefined) return arr.push(el)
              else if ($.zepto.isZ(el)) return arr = arr.concat(el.get())
              arr = arr.concat(zepto.fragment(el))
            })
            return arr
          }
          return argType == "object" || arg == null ?
            arg : zepto.fragment(arg)
        }),
        parent, copyByClone = this.length > 1
    
    // 如果this不存在，则直接返回this，即一个空zepto集合
    if (nodes.length < 1) return this

    return this.each(function(_, target){
      parent = inside ? target : target.parentNode

      // [ 'after', 'prepend', 'before', 'append' ]
      // convert all methods to a "before" operation
      target = operatorIndex == 0 ? target.nextSibling :
                operatorIndex == 1 ? target.firstChild :
                operatorIndex == 2 ? target :
                null

      var parentInDocument = $.contains(document.documentElement, parent)

      nodes.forEach(function(node){
        // 如果this存在多个的话，克隆需要添加的node节点
        if (copyByClone) node = node.cloneNode(true)
        // 如果不存在父元素，直接把node集合删除
        else if (!parent) return $(node).remove()

        // 通过insertBefore插入不同的位置（target对应）
        parent.insertBefore(node, target)
        if (parentInDocument) traverseNode(node, function(el){
          if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
              (!el.type || el.type === 'text/javascript') && !el.src){
            var target = el.ownerDocument ? el.ownerDocument.defaultView : window
            target['eval'].call(target, el.innerHTML)
          }
        })
      })
    })
  }

  // 相反的方式执行（this和参数置换）
  // after    => insertAfter
  // prepend  => prependTo
  // before   => insertBefore
  // append   => appendTo
  $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
    $(html)[operator](this)
    return this
  }
})
```