<!-- TOC -->

- [暴露的方法](#暴露的方法)
  - [$.fn.serializeArray](#fnserializearray)
    - [调用方式](#调用方式)
    - [源码解析](#源码解析)
  - [$.fn.serialize](#fnserialize)
    - [源码解析](#源码解析-1)
  - [$.fn.submit](#fnsubmit)
    - [源码解析](#源码解析-2)

<!-- /TOC -->

## 暴露的方法

### $.fn.serializeArray
根据表单的name，生成键值对

#### 调用方式
```javascript
$('form').serializeArray()
//=> [{ name: 'size', value: 'micro' },
//    { name: 'name', value: 'Zepto' }]
```

#### 源码解析
```javascript
$.fn.serializeArray = function() {
  var name, type, result = [],
    add = function(value) {
      // 如果是select且为多选的时候，则返回的value为数组
      if (value.forEach) return value.forEach(add)
      result.push({ name: name, value: value })
    }
  
  // this[0].elements 返回包含表单中所有元素的数组(input,button)
  if (this[0]) $.each(this[0].elements, function(_, field){
    type = field.type, name = field.name
    // 如果有name，
    // 且nodeName不等于fieldset
    // 且属性非disable
    // 且type不等于submit,reset,button,file
    // 且如果type为radio或者checkbox时，checked为true时候
    // 通过add函数返回数组（包含name,value键值对）
    if (name && field.nodeName.toLowerCase() != 'fieldset' &&
      !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
      ((type != 'radio' && type != 'checkbox') || field.checked))
        add($(field).val())
  })
  return result
}
```

### $.fn.serialize
在Ajax post请求中将用作提交的表单元素的值编译成 URL编码的 字符串。

#### 源码解析
```javascript
$.fn.serialize = function(){
  var result = []
  // this.serializeArray() -> [{name:'a',value:1},{name:'a',value:2}]
  this.serializeArray().forEach(function(elm){
    result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
  })
  // 返回a=1&a=2
  return result.join('&')
}
```

### $.fn.submit
提交回调

#### 源码解析
```javascript
$.fn.submit = function(callback) {
  // 如果有参数，则绑定回调函数
  if (0 in arguments) this.bind('submit', callback)
  // 没有回调函数的话 那触发submit事件
  else if (this.length) {
    var event = $.Event('submit')
    this.eq(0).trigger(event)
    // 如果没有阻止默认事件，则执行默认提交
    if (!event.isDefaultPrevented()) this.get(0).submit()
  }
  return this
}
```