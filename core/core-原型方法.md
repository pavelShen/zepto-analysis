<!-- TOC -->

- [原型方法](#原型方法)
  - [ready](#ready)
  - [each](#each)
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
adjacencyOperators.forEach(function(operator, operatorIndex) {
  var inside = operatorIndex % 2 //=> prepend, append

  $.fn[operator] = function(){
    // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
    var argType, nodes = $.map(arguments, function(arg) {
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
    if (nodes.length < 1) return this

    return this.each(function(_, target){
      parent = inside ? target : target.parentNode

      // convert all methods to a "before" operation
      target = operatorIndex == 0 ? target.nextSibling :
                operatorIndex == 1 ? target.firstChild :
                operatorIndex == 2 ? target :
                null

      var parentInDocument = $.contains(document.documentElement, parent)

      nodes.forEach(function(node){
        if (copyByClone) node = node.cloneNode(true)
        else if (!parent) return $(node).remove()

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