<!-- TOC -->

- [原型方法](#%E5%8E%9F%E5%9E%8B%E6%96%B9%E6%B3%95)
    - [ready](#ready)
    - [each](#each)
  - [元素匹配](#%E5%85%83%E7%B4%A0%E5%8C%B9%E9%85%8D)
    - [filter](#filter)
    - [not](#not)
    - [has](#has)
    - [find](#find)
    - [closest](#closest)
    - [parents](#parents)
    - [children](#children)
  - [dom操作](#dom%E6%93%8D%E4%BD%9C)
    - [wrap,wrapAll](#wrapwrapall)
    - [after,prepend,before,append,insertAfter,insertBefore,appendTo,prependTo](#afterprependbeforeappendinsertafterinsertbeforeappendtoprependto)
  - [属性操作(获取，赋值)](#%E5%B1%9E%E6%80%A7%E6%93%8D%E4%BD%9C%E8%8E%B7%E5%8F%96%EF%BC%8C%E8%B5%8B%E5%80%BC)
    - [attr](#attr)
    - [data](#data)
    - [width,height](#widthheight)
    - [css](#css)
    - [hasClass](#hasclass)
  - [偏移](#%E5%81%8F%E7%A7%BB)
    - [offsetParent](#offsetparent)
    - [offset](#offset)
    - [scrollTop](#scrolltop)

<!-- /TOC -->

# 原型方法

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

## 元素匹配

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

## dom操作

### wrap,wrapAll
```javascript
wrap: function(structure){
  var func = isFunction(structure)
  // 存在需要包裹的元素 && 传入的不是一个方法
  if (this[0] && !func)
    // 传入的structure应该是('<div><p></p></div>')这种样子
    // 这样他会通过$函数=》zepto.fragment =》createElement生成新的dom元素
    // 注：建议这里不要传入选择器，不然他会去dom中取得符合条件的第一个元素，大多数情况会与预想不符
    var dom   = $(structure).get(0),
    // 有父元素或者长度大于1（注意：是大于！没有等于！）
    // 如果有父元素（这里理解成已经存在于dom的元素比较方便）或者有多个元素需要wrap，则克隆包裹的构造器
        clone = dom.parentNode || this.length > 1

  // 对每一个元素执行wrapAll方法
  return this.each(function(index){
    // 如果传入方法，则对dom执行该方法，根据返回值生成新的structure
    // $('input').wrap(function(index){
    //   return '<span class=' + this.type + 'field />'
    // })
    //=> <span class=textfield><input type=text /></span>,
    //   <span class=searchfield><input type=search /></span>
    $(this).wrapAll(
      func ? structure.call(this, index) :
        clone ? dom.cloneNode(true) : dom
    )
  })
},
wrapAll: function(structure){
  // 存在需要wrap的元素
  if (this[0]) {
    // 在需要wrap的元素之前插入$(structure)
    $(this[0]).before(structure = $(structure))
    // <div class="a"></div><div class="box">...</div>
    var children
    // 进入structure的最深层级
    // structure有子元素,则替换structure为他的第一个子元素
    while ((children = structure.children()).length) structure = children.first()
    $(structure).append(this)
  }
  // 因为这里返回的是this，
  // 所以$('<em>broken</em>').wrap('<li>').appendTo(document.body)写法无效
  // 替代方案 $('<em>better</em>').appendTo(document.body).wrap('<li>')
  return this
},
```

### after,prepend,before,append,insertAfter,insertBefore,appendTo,prependTo
```javascript
// adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
adjacencyOperators.forEach(function(operator, operatorIndex) {
  // 操作的是元素内部？
  var inside = operatorIndex % 2 //  => true(prepend, append)

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

        // 通过insertBefore插入(移动)到不同的位置（target对应）
        parent.insertBefore(node, target)
        if (parentInDocument) traverseNode(node, function(el){
          // node是个script的话
          if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
              (!el.type || el.type === 'text/javascript') && !el.src){
            var target = el.ownerDocument ? el.ownerDocument.defaultView : window
            // window.eval(脚本内容)
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

## 属性操作(获取，赋值)

### attr
```javascript
attr: function(name, value){
  var result
  return (typeof name == 'string' && !(1 in arguments)) ?
    // 只有一个参数，获取值
    (0 in this && this[0].nodeType == 1 && (result = this[0].getAttribute(name)) != null ? result : undefined) :
    // 设置值
    this.each(function(idx){
      if (this.nodeType !== 1) return
      if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
      else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
    })
},
```

### data
```javascript
data: function(name, value){
  // <div data-userName='syc'></div>
  // data-user-name
  var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()

  var data = (1 in arguments) ?
    this.attr(attrName, value) :
    this.attr(attrName)

  // deserializeValue =>
  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // "08"    => "08"
  // JSON    => parse if valid
  // String  => self
  return data !== null ? deserializeValue(data) : undefined
},
```

### width,height
```javascript
// Generate the `width` and `height` functions
;['width', 'height'].forEach(function(dimension){
  // 首字母大写
  var dimensionProperty =
    dimension.replace(/./, function(m){ return m[0].toUpperCase() })

  $.fn[dimension] = function(value){
    var offset, el = this[0]
    // 取值
    if (value === undefined) return isWindow(el) ? el['inner' + dimensionProperty] :
      isDocument(el) ? el.documentElement['scroll' + dimensionProperty] :
      // zepto对象执行offset方法获取this[0]的offset，再获取结果
      // offset方法中获取的宽高是Math.round的结果
      (offset = this.offset()) && offset[dimension]
    // 赋值
    else return this.each(function(idx){
      el = $(this)
      el.css(dimension, funcArg(this, value, idx, el[dimension]()))
    })
  }
})
```

### css
```javascript
css: function(property, value){
  // 取值
  if (arguments.length < 2) {
    var element = this[0]
    // 设置单个值
    if (typeof property == 'string') {
      if (!element) return
      // border-top => borderTop
      // 通常，要了解元素样式的信息，仅仅使用 style 属性是不够的，这是因为它只包含了在元素内嵌 style 属性（attribute）上声明的的 CSS 属性，而不包括来自其他地方声明的样式，如 <head> 部分的内嵌样式表，或外部样式表。要获取一个元素的所有 CSS 属性，你应该使用 window.getComputedStyle()。
      return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)
    } 
    // $('.box').css(['height','top'])
    // 返回{height: "44px", top: "auto"}
    else if (isArray(property)) {
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
    // value为非值（排除0）
    if (!value && value !== 0)
      this.each(function(){ this.style.removeProperty(dasherize(property)) })
    else
      // borderTop:30px
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

### hasClass
```javascript
hasClass: function(name){
  if (!name) return false
  // some第二个参数为回调函数的this值
  return emptyArray.some.call(this, function(el){
    return this.test(className(el))
  }, classRE(name))
},
```

## 偏移

### offsetParent
```javascript
offsetParent: function() {
  return this.map(function(){
    // display:none的情况 => null
    var parent = this.offsetParent || document.body
    // offsetParent的祖先定位可能会取到table元素，详情参见offsetParent的mdn
    while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
      parent = parent.offsetParent
    return parent
  })
}
```

### offset
```javascript
offset: function(coordinates){
  // 设置offset的值，修改$(this)的位置，位置是相对于document的位置
  // 注意这里会修改position属性
  if (coordinates) return this.each(function(index){
    var $this = $(this),
        coords = funcArg(this, coordinates, index, $this.offset()),
        parentOffset = $this.offsetParent().offset(),
        props = {
          top:  coords.top  - parentOffset.top,
          left: coords.left - parentOffset.left
        }

    if ($this.css('position') == 'static') props['position'] = 'relative'
    $this.css(props)
  })
  // 错误处理
  if (!this.length) return null
  if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
    return {top: 0, left: 0}
  var obj = this[0].getBoundingClientRect()
  // 最后将结果返回
  return {
    left: obj.left + window.pageXOffset,
    top: obj.top + window.pageYOffset,
    width: Math.round(obj.width),
    height: Math.round(obj.height)
  }
},
```

### scrollTop
```javascript
scrollTop: function(value){
  if (!this.length) return
  // document.documentElement || document.body
  var hasScrollTop = 'scrollTop' in this[0]
  // 没有传值，获取scrollTop
  // 如果存在scrollTop属性 => 获取滚动条滚动距离
  // 当一个元素的内容没有产生垂直方向的滚动条，那么它的 scrollTop 值为0。
  // 所以常规dom元素都有scrollTop
  // window对象则取pageYOffset
  if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset
  return this.each(hasScrollTop ?
    // 内部元素滚动，如果无法滚动，再次获取还会是0
    function(){ this.scrollTop = value } :
    // window滚动
    function(){ this.scrollTo(this.scrollX, value) })
},
```















