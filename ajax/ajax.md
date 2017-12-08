# 入口 198行 $.ajax = function(options){}
测试代码见同级目录src文件

## 通过trigger触发自定义事件ajaxStart
```javascript
$(document).on('ajaxStart', function(e){
  
})
```

当global: true时，触发钩子函数
- ajaxStart (global)：如果没有其他Ajax请求当前活跃将会被触发。
- ajaxBeforeSend (data: xhr, options)：再发送请求前，可以被取消。
- ajaxSend (data: xhr, options)：像 ajaxBeforeSend，但不能取消。
- ajaxSuccess (data: xhr, options, data)：当返回成功时。
- ajaxError (data: xhr, options, error)：当有错误时。
- ajaxComplete (data: xhr, options)：请求已经完成后，无论请求是成功或者失败。
- ajaxStop (global)：如果这是最后一个活跃着的Ajax请求，将会被触发。

## 根据调用的url和location.host是否相等来设置crossDomain
创建个a元素，通过a元素的href来获取调用url的host
```javascript
urlAnchor = document.createElement('a')
urlAnchor.href = settings.url
settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host)
```

## serializeData
将data数据参数化，重新赋值给data
如果是type是get或者jsonp,则拼接字符串，重新赋值给url
先不用管是否是第一个参数，将字符串拼接完成后再把第一个&修改为？
```javascript
function appendQuery(url, query) {
  if (query == '') return url
  return (url + '&' + query).replace(/[&?]{1,2}/, '?')
}
```

## cache
根据cache参数来判断是否在url上添加时间戳

## jsonp
如果dataType=jsonp,则在url最后拼接callback=?，传入setting 返回$.ajaxJSONP方法，后面详细介绍

## 设置header值

## 触发ajaxBeforeSend钩子，如果ajaxBeforeSend返回false 中断ajax请求,触发ajaxError钩子（内部触发ajaxComplete钩子-》ajaxStop钩子）
相关代码
```javascript
$(document).on('ajaxBeforeSend', function(e, xhr, options){
  // 捕获所有ajax请求，xhr对象和ajax的options允许被修改，返回false则取消请求
  options.type = 'POST'
})
```

## 设置async属性，执行xhr.open,触发xhr.onreadystatechange(readyState切换为1)
`xhr.open(settings.type, settings.url, async, settings.username, settings.password)`

值	状态	描述
0	UNSENT	代理被创建，但尚未调用 open() 方法。
1	OPENED	open() 方法已经被调用。
2	HEADERS_RECEIVED	send() 方法已经被调用，并且头部和状态已经可获得。
3	LOADING	下载中； responseText 属性已经包含部分数据。
4	DONE	下载操作已完成。

## 执行xhr.send(settings.data ? settings.data : null),触发xhr.onreadystatechange(readyState切换为2->3->4)

## status判断，如果请求的协议为文件，则status为0也是正常的状态
```if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) ```

## 成功则进入ajaxSuccess，失败则进入ajaxError->complete->stop

## arraybuffer或者blob二进制数据特殊处理
```javascript
if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
  result = xhr.response
else {
  result = xhr.responseText
}
```

## 隐藏参数，对返回的结果进行过滤
```javascript
dataFilter:function(data,type){
  return JSON.parse(data).s
},
```

## 根据类型进行结果的返回
```javascript
if (dataType == 'script')    (1,eval)(result)
else if (dataType == 'xml')  result = xhr.responseXML
else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
```

## 执行ajaxSuccess
先调用success方法，再触发全局的ajaxSuccess钩子

## 执行ajaxComplete
调用complete方法，再触发全局的ajaxComplete钩子

## 执行ajaxStop
触发全局的ajaxStop钩子

---

# $.ajaxJSONP方法（83行）

```javascript
$.ajaxJSONP = function(options, deferred){
  // ajaxJSONP方法容错，如果没有传入type，则走原始的ajax方法
  if (!('type' in options)) return $.ajax(options)
  // 指定callbackName,如果传入的jsonpCallback为函数，则callbackName为函数返回值
  // 不然就是字符串，如果不传，则是Zepto+时间戳
  var _callbackName = options.jsonpCallback,
    callbackName = ($.isFunction(_callbackName) ?
      _callbackName() : _callbackName) || ('Zepto' + (jsonpID++)),
    script = document.createElement('script'),
    // 将原始的回调暂存，防止变量重名覆盖
    originalCallback = window[callbackName],
    responseData,
    // 异常处理
    abort = function(errorType) {
      $(script).triggerHandler('error', errorType || 'abort')
    },
    xhr = { abort: abort }, abortTimeout

  if (deferred) deferred.promise(xhr)

  $(script).on('load error', function(e, errorType){
    // 只要脚本读取完成或者触发了error事件，则立即清除超时的定时器
    clearTimeout(abortTimeout)
    // 取消事件绑定，使监听只执行一次
    $(script).off().remove()

    if (e.type == 'error' || !responseData) {
      ajaxError(null, errorType || 'error', xhr, options, deferred)
    } else {
      // 将脚本内的数据传给success方法
      ajaxSuccess(responseData[0], xhr, options, deferred)
    }

    // 还原覆盖前的回调方法，如果存在，则将脚本返回的数据传入，再执行一次
    window[callbackName] = originalCallback
    if (responseData && $.isFunction(originalCallback))
      originalCallback(responseData[0])

    // 数据重置
    originalCallback = responseData = undefined
  })

  // 触发ajaxBeforeSend钩子函数
  if (ajaxBeforeSend(xhr, options) === false) {
    abort('abort')
    return xhr
  }

  // 将返回值放入responseData
  window[callbackName] = function(){
    responseData = arguments
  }

  // 转换路径，将callbackName放入url末尾
  script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName)
  // 插入脚本
  document.head.appendChild(script)

  // 超时处理
  if (options.timeout > 0) abortTimeout = setTimeout(function(){
    abort('timeout')
  }, options.timeout)

  return xhr
}
```
