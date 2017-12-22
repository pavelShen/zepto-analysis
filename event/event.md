<!-- TOC -->

- [代码结构](#代码结构)
  - [常量](#常量)
  - [工具函数](#工具函数)
    - [zid](#zid)
    - [findHandlers](#findhandlers)
    - [parse](#parse)
    - [matcherFor](#matcherfor)
    - [eventCapture](#eventcapture)
    - [realEvent](#realevent)
    - [add(重要)](#add重要)
    - [remove](#remove)
    - [createProxy](#createproxy)
    - [compatible](#compatible)
      - [stopImmediatePropagation](#stopimmediatepropagation)
- [暴露的方法](#暴露的方法)
  - [$.Event](#event)
  - [$.proxy](#proxy)
  - [$.fn.on](#fnon)
    - [on方法的变种](#on方法的变种)
  - [off](#off)
    - [off方法的变种](#off方法的变种)
  - [trigger](#trigger)
  - [triggerHandler](#triggerhandler)

<!-- /TOC -->

## 代码结构

### 常量
```javascript
var _zid = 1, undefined,
    slice = Array.prototype.slice,
    isFunction = $.isFunction,
    isString = function(obj){ return typeof obj == 'string' },
    handlers = {},
    specialEvents={},
    focusinSupported = 'onfocusin' in window,
    focus = { focus: 'focusin', blur: 'focusout' },
    hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

var returnTrue = function(){return true},
    returnFalse = function(){return false},
    ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$|webkitMovement[XY]$)/,
    eventMethods = {
      preventDefault: 'isDefaultPrevented',
      stopImmediatePropagation: 'isImmediatePropagationStopped',
      stopPropagation: 'isPropagationStopped'
    }
```

### 工具函数

#### zid
```javascript
// 获取zepto对象或者proxy方法上存储的id值，
// 如果不存在，则
// 给每个绑定事件的zepto对象或者proxy的方法设置一个id
function zid(element) {
  return element._zid || (element._zid = _zid++)
}
```

#### findHandlers
```javascript
function findHandlers(element, event, fn, selector) {
  // 返回事件名和事件的命名空间
  event = parse(event)
  if (event.ns) var matcher = matcherFor(event.ns)
  // 每个绑定事件的元素，根据zid放入handlers下
  // handlers[元素的zid] 里面包含该元素下绑定的所有事件（数组）
  // handlers[元素的zid][0]  {e: "click", ns: "abc", fn: ƒ, sel: undefined, del: undefined, …}
  // 返回该元素上event.e & event.ns相同的事件
  return (handlers[zid(element)] || []).filter(function(handler) {
    return handler
      && (!event.e  || handler.e == event.e)
      && (!event.ns || matcher.test(handler.ns))
      && (!fn       || zid(handler.fn) === zid(fn))
      && (!selector || handler.sel == selector)
  })
}
```

#### parse
```javascript
// 场景：.on("click.abc")
// 返回{e:事件名，ns:事件命名空间}
function parse(event) {
  var parts = ('' + event).split('.')
  return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
}
```

#### matcherFor
```javascript
// 匹配命名空间的正则
function matcherFor(ns) {
  return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
}
```

#### eventCapture
```javascript
// 根据handler对象上的值，设置事件的触发时机
// delegator && 非focus 则事件捕获时触发，否则根据传入的值进行设置，未设置则为false
function eventCapture(handler, captureSetting) {
  return handler.del &&
    (!focusinSupported && (handler.e in focus)) ||
    !!captureSetting
}
```

#### realEvent
对mouseenter等事件的模拟兼容
```javascript
// focusinSupported = 'onfocusin' in window,
// focus = { focus: 'focusin', blur: 'focusout' },
// hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }
// 兼容处理
function realEvent(type) {
  return hover[type] || (focusinSupported && focus[type]) || type
}
```

#### add(重要) 
建立handlers来管理元素所绑定的事件
```javascript
function add(element, events, fn, data, selector, delegator, capture){
  var id = zid(element), set = (handlers[id] || (handlers[id] = []))
  events.split(/\s/).forEach(function(event){
    if (event == 'ready') return $(document).ready(fn)
    // handlers[元素的zid] 里面包含该元素下绑定的所有事件（数组）
    // handlers[元素的zid][0]  {e: "click", ns: "abc", fn: ƒ, sel: undefined, del: undefined, …}
    var handler   = parse(event)
    handler.fn    = fn
    handler.sel   = selector
    // emulate mouseenter, mouseleave
    if (handler.e in hover) fn = function(e){
      var related = e.relatedTarget
      if (!related || (related !== this && !$.contains(this, related)))
        return handler.fn.apply(this, arguments)
    }
    handler.del   = delegator
    var callback  = delegator || fn
    handler.proxy = function(e){
      // 对event进行常规扩展
      e = compatible(e)
      if (e.isImmediatePropagationStopped()) return
      e.data = data
      // 执行回调函数
      var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args))
      if (result === false) e.preventDefault(), e.stopPropagation()
      return result
    }
    handler.i = set.length
    set.push(handler)
    if ('addEventListener' in element)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
  })
}
```

#### remove
```javascript
// 通过findHandlers找到对应的事件，delete
// 同时移除addEventListener的监听
function remove(element, events, fn, selector, capture){
  var id = zid(element)
  ;(events || '').split(/\s/).forEach(function(event){
    findHandlers(element, event, fn, selector).forEach(function(handler){
      delete handlers[id][handler.i]
    if ('removeEventListener' in element)
      element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  })
}
```

#### createProxy
```javascript
// 浅拷贝event对象，并且通过compatible进行扩展
function createProxy(event) {
  var key, proxy = { originalEvent: event }
  for (key in event)
    if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

  return compatible(proxy, event)
}
```

#### compatible

##### stopImmediatePropagation
如果某个元素有多个相同类型事件的事件监听函数,则当该类型的事件触发时,多个事件监听函数将按照顺序依次执行.如果某个监听函数执行了 event.stopImmediatePropagation()方法,则除了该事件的冒泡行为被阻止之外(event.stopPropagation方法的作用),该元素绑定的后序相同类型事件的监听函数的执行也将被阻止.

- isDefaultPrevented，isImmediatePropagationStopped，isPropagationStopped方法的实现
```javascript
function compatible(event, source) {
  if (source || !event.isDefaultPrevented) {
    source || (source = event)

    // 重写event对象上的preventDefault，stopImmediatePropagation，stopPropagation方法
    // 在event上暴露isDefaultPrevented，isImmediatePropagationStopped，isPropagationStopped方法
    // 判断是否执行过那些阻止事件

    // eventMethods = {
    //   preventDefault: 'isDefaultPrevented',
    //   stopImmediatePropagation: 'isImmediatePropagationStopped',
    //   stopPropagation: 'isPropagationStopped'
    // }
    $.each(eventMethods, function(name, predicate) {
      var sourceMethod = source[name]
      event[name] = function(){
          this[predicate] = returnTrue
          return sourceMethod && sourceMethod.apply(source, arguments)
      }
      event[predicate] = returnFalse
    })

    // 设定event的时间戳
    try {
      event.timeStamp || (event.timeStamp = Date.now())
    } catch (ignored) { }

    // 设置event的defaultPrevented属性（是否执行过event.preventDefault()），并对不支持的浏览器做兼容
    if (source.defaultPrevented !== undefined ? source.defaultPrevented :
        'returnValue' in source ? source.returnValue === false :
        source.getPreventDefault && source.getPreventDefault())
    event.isDefaultPrevented = returnTrue
  }
  return event
}
```

## 暴露的方法

### $.Event
自定义事件
```javascript
$.Event = function(type, props) {
  if (!isString(type)) props = type, type = props.type
  // 创建事件，设定是否冒泡
  var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
  // 遍历props属性，如果设置了bubbles，则修改事件的冒泡属性，并将其他值绑定在event对象上
  if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
  // 自定义事件初始化
  event.initEvent(type, bubbles, true)
  return compatible(event)
}
```

createEvent使用的许多方法, 如 initCustomEvent, 都被废弃了. 请使用 event constructors 来替代.
```javascript
// 老代码
var event = document.createEvent('Event');
event.initEvent('click', true, false);
elem.addEventListener('click', function (e) {}, false);
elem.dispatchEvent(event);

// 新代码
var ev = new Event("look", {"bubbles":true, "cancelable":false});
document.addEventListener('look',function(){})
document.dispatchEvent(ev);
```

### $.proxy
指定方法的上下文，返回的是一个方法
```javascript
$.proxy = function(fn, context) {
  // 2 in arguments -> arguments真实长度判断
  // 获取额外参数
  var args = (2 in arguments) && slice.call(arguments, 2)
  // 如果参数第一个值是方法 -》指定context为fn的上下文，并传入额外参数，
  // 在方法上绑定一个自增id
  if (isFunction(fn)) {
    var proxyFn = function(){ return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments) }
    proxyFn._zid = zid(fn)
    return proxyFn
  }
  // 第一个参数是对象，对该对象上的context方法执行代理操作 
  else if (isString(context)) {
    if (args) {
      args.unshift(fn[context], fn)
      return $.proxy.apply(null, args)
    } else {
      return $.proxy(fn[context], fn)
    }
  } else {
    throw new TypeError("expected function")
  }
}
```

例子：
```javascript
var obj = {name: 'Zepto'},
handler = function(a,b){ console.log("hello from + ", this.name) }

$(document).on('click', $.proxy(handler, obj))
```

### $.fn.on
说白了，就是根据不同的情形，把参数的位置换正确，然后每个zepto对象执行add方法做事件监听
```javascript
$.fn.on = function(event, selector, data, callback, one){
  var autoRemove, delegator, $this = this
  // 调用方式
  // on({ type: handler, type2: handler2, ... }, [selector])
  if (event && !isString(event)) {
    $.each(event, function(type, fn){
      $this.on(type, selector, data, fn, one)
    })
    return $this
  }

  // on('click',function(){})
  // 修改回调函数的位置
  if (!isString(selector) && !isFunction(callback) && callback !== false)
    callback = data, data = selector, selector = undefined
  if (callback === undefined || data === false)
    callback = data, data = undefined

  if (callback === false) callback = returnFalse

  // 使用add方法给元素绑定事件
  return $this.each(function(_, element){
    if (one) autoRemove = function(e){
      remove(element, e.type, callback)
      return callback.apply(this, arguments)
    }

    if (selector) delegator = function(e){
      var evt, match = $(e.target).closest(selector, element).get(0)
      if (match && match !== element) {
        evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
        return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)))
      }
    }

    add(element, event, callback, data, selector, delegator || autoRemove)
  })
}
```

#### on方法的变种
- $.fn.bind
- $.fn.live 
- $.fn.delegate
- $.fn.one

### off
和on同理，也是调整参数位置，然后每个zepto对象执行remove方法移除事件监听
```javascript
$.fn.off = function(event, selector, callback){
  var $this = this
  if (event && !isString(event)) {
    $.each(event, function(type, fn){
      $this.off(type, selector, fn)
    })
    return $this
  }

  if (!isString(selector) && !isFunction(callback) && callback !== false)
    callback = selector, selector = undefined

  if (callback === false) callback = returnFalse

  return $this.each(function(){
    remove(this, event, callback, selector)
  })
}
```

#### off方法的变种
- $.fn.unbind
- $.fn.die
- $.fn.undelegate



### trigger
```javascript
$.fn.trigger = function(event, args){
  // 如果是字符串，则通过$.Event创建event对象，如果是原生的event对象，则使用compatible函数做扩展
  event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event)
  event._args = args
  return this.each(function(){
    // focus = { focus: 'focusin', blur: 'focusout' },
    // 如果是focus或者blur方法，则直接执行
    if (event.type in focus && typeof this[event.type] == "function") this[event.type]()
    // 触发dom元素上的监听事件
    else if ('dispatchEvent' in this) this.dispatchEvent(event)
    // 非dom元素 直接触发回调（看代码提交记录，感觉像是兼容性处理）
    // (todo: possibly support events on plain old objects)
    else $(this).triggerHandler(event, args)
  })
}
```

### triggerHandler
```javascript
// 在当前元素上触发事件,但是不会触发实际事件，也不会冒泡
$.fn.triggerHandler = function(event, args){
  var e, result
  this.each(function(i, element){
    e = createProxy(isString(event) ? $.Event(event) : event)
    e._args = args
    e.target = element
    // 找到该元素中对应的事件（event相同，event.ns相同）
    $.each(findHandlers(element, event.type || event), function(i, handler){
      // 触发回调函数
      // 因为并不是通过dispatchEvent触发，所以也不会冒泡
      // handler {e: "click", ns: "abc", fn: 回调函数, sel: undefined, del: undefined, …}
      result = handler.proxy(e)
      if (e.isImmediatePropagationStopped()) return false
    })
  })
  return result
}
```