
## 选择器

```javascript
function Z(dom, selector) {
  var i, len = dom ? dom.length : 0
  // dom[i] 每个选中的zepto元素
  for (i = 0; i < len; i++) this[i] = dom[i]
  this.length = len
  this.selector = selector || ''
}

// 返回一个Z实例（一个包含所有选中元素的数组）
zepto.Z = function(dom, selector) {
  return new Z(dom, selector)
}

// 通过html字符串，生成一个包含匹配node节点的数组
// zepto.fragment('<div class="a">','div',上下文)
zepto.fragment = function(html, name, properties) {
  var dom, nodes, container

  // singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/
  // 单标签的兼容<input type="text" />
  // dom = $(‘div’)
  if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

  if (!dom) {
    // tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    // $1 带class等属性 $2只有标签名
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    /* name不传的情况的兼容 */
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    /*
      containers = {
        'tr': document.createElement('tbody'),
        'tbody': table, 'thead': table, 'tfoot': table,
        'td': tableRow, 'th': tableRow,
        '*': document.createElement('div')
      },
    */
    if (!(name in containers)) name = '*'

    // 非特殊标签，则创建div
    container = containers[name]
    // <div> html变量 </div>
    container.innerHTML = '' + html
    // dom为子元素，container为包裹的元素，下面没有子元素
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // 属性赋值
  if (isPlainObject(properties)) {
    nodes = $(dom)
    $.each(properties, function(key, value) {
      // methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],
      // $('div').val('abc')
      if (methodAttributes.indexOf(key) > -1) nodes[key](value)
      else nodes.attr(key, value)
    })
  }

  return dom
}

// 使用document.querySelectorAll方法
// 对一些特殊情况作了优化（#id）
// 实现css选择器
zepto.qsa = function(element, selector){
  var found,
      maybeID = selector[0] == '#',
      maybeClass = !maybeID && selector[0] == '.',
      nameOnly = maybeID || maybeClass ? selector.slice(1) : selector,
      // simpleSelectorRE = /^[\w-]*$/,
      // 单个选择器？
      isSimple = simpleSelectorRE.test(nameOnly)
  // safari下document.createDocumentFragment创建的片段没有getElementById方法
  return (element.getElementById && isSimple && maybeID) ?
    ( (found = element.getElementById(nameOnly)) ? [found] : [] ) :
    // 1:element 9:document 11:documentFragment
    (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? [] :
    slice.call(
      isSimple && !maybeID && element.getElementsByClassName ? // DocumentFragment 没有 getElementsByClassName/TagName 方法
        maybeClass ? element.getElementsByClassName(nameOnly) : // 如果是class，执行getElementsByClassName
        element.getElementsByTagName(selector) : // 或者是一个tag
        element.querySelectorAll(selector) // 复杂元素
    )
}

// 一个可选上下文的css选择器
zepto.init = function(selector, context) {
  var dom
  // selector为空，则返回个空的Zepto集合
  if (!selector) return zepto.Z()
  // string选择器
  else if (typeof selector == 'string') {
    selector = selector.trim()
    // 以为<符号开头，类似<div class="abc">的html标签
    // fragmentRE = /^\s*<(\w+|!)[^>]*>/ 第一组匹配是标签名，上面那个例子即是div
    if (selector[0] == '<' && fragmentRE.test(selector))
      // 返回zepto对象
      dom = zepto.fragment(selector, RegExp.$1, context), selector = null
    // 如果存在context，则在context元素下查找选择的元素
    // $('div','body') 查找body下的div元素
    else if (context !== undefined) return $(context).find(selector)
    // 如果是css选择器，执行qsa方法选择节点
    else dom = zepto.qsa(document, selector)
  }
  // 如果是一个方法，则在ready后调用
  // 例子：$(function(){})
  else if (isFunction(selector)) return $(document).ready(selector)
  // 如果已经是一个zepto对象了，直接返回
  else if (zepto.isZ(selector)) return selector
  // 包裹原生dom
  else {
    // 返回一个node节点的数组，并过滤掉null值
    if (isArray(selector)) dom = compact(selector)
    // 如果是一个dom节点
    else if (isObject(selector))
      dom = [selector], selector = null
    // 如果是一个html片段，从他身上创建节点
    else if (fragmentRE.test(selector))
      dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
    // 如果存在context，则通过find函数在context下寻找dom集合
    else if (context !== undefined) return $(context).find(selector)
    // 保底方案，使用zepto的css选择器获取节点
    else dom = zepto.qsa(document, selector)
  }
  // 用找到的node节点创建一个新的zepto集合
  return zepto.Z(dom, selector)
}

$ = function(selector, context){
  return zepto.init(selector, context)
}

// 在Z的原型上绑定原型方法
zepto.Z.prototype = Z.prototype = $.fn

return $
```