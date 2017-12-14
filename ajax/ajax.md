<!-- TOC -->

- [代码结构](#代码结构)
  - [全局事件触发器](#全局事件触发器)
  - [钩子函数](#钩子函数)
  - [ajax 数据过滤器](#ajax-数据过滤器)
  - [默认设置](#默认设置)
  - [工具函数](#工具函数)
- [暴露的方法](#暴露的方法)
  - [$.ajax](#ajax)
    - [合并配置信息](#合并配置信息)
    - [触发 ajaxStart 钩子](#触发-ajaxstart-钩子)
    - [根据 url 来设置 crossDomain 的值](#根据-url-来设置-crossdomain-的值)
    - [调用 serializeData 函数，将`options.data`转字符串 , 如果是 get 或者 jsonp，将data 字符串拼接到 url 上](#调用-serializedata-函数将optionsdata转字符串--如果是-get-或者-jsonp将data-字符串拼接到-url-上)
    - [cache](#cache)
    - [jsonp](#jsonp)
    - [设置 header 值](#设置-header-值)
    - [ajax状态监听函数`onreadystatechange`](#ajax状态监听函数onreadystatechange)
    - [触发 ajaxBeforeSend 钩子](#触发-ajaxbeforesend-钩子)
    - [设置 async 属性](#设置-async-属性)
    - [执行 xhr.open, 触发 xhr.onreadystatechange(readyState 切换为 1)](#执行-xhropen-触发-xhronreadystatechangereadystate-切换为-1)
    - [调用`nativeSetHeader`方法，设置xhr的header头](#调用nativesetheader方法设置xhr的header头)
    - [如果timeout>0,开启超时的定时器，如果超过时间，触发中断方法](#如果timeout0开启超时的定时器如果超过时间触发中断方法)
    - [执行xhr.send方法发送数据请求-》（触发 xhr.onreadystatechange(readyState 切换为 2->3->4)）](#执行xhrsend方法发送数据请求-触发-xhronreadystatechangereadystate-切换为-2-3-4)
    - [当请求的状态为下载完成时，清空对请求状态的监听，并清除超时定时器](#当请求的状态为下载完成时清空对请求状态的监听并清除超时定时器)
    - [对xhr进行解析](#对xhr进行解析)
    - [请求成功则逐步触发 ajaxSuccess->complete->stop，失败则触发 ajaxError->complete->stop](#请求成功则逐步触发-ajaxsuccess-complete-stop失败则触发-ajaxerror-complete-stop)
  - [$.ajaxJSONP](#ajaxjsonp)

<!-- /TOC -->

测试代码见同级目录 src 文件

## 代码结构

### 全局事件触发器

通过 triggerGlobal 函数调用 triggerAndReturn 函数来触发全局的监听事件

例子：

```javascript
$(document).on("ajaxBeforeSend", function(e, xhr, options) {
  // 捕获所有ajax请求，xhr对象和ajax的options允许被修改，返回false则取消请求
  options.type = "POST";
});
```

### 钩子函数

当 global: true 时，触发钩子函数

* ajaxStart (global)：如果没有其他 Ajax 请求当前活跃将会被触发。
* ajaxBeforeSend (data: xhr, options) ：再发送请求前，可以被取消。
* ajaxSend (data: xhr, options) ：像 ajaxBeforeSend，但不能取消。
* ajaxSuccess (data: xhr, options, data) ：当返回成功时。
* ajaxError (data: xhr, options, error) ：当有错误时。
* ajaxComplete (data: xhr, options) ：请求已经完成后，无论请求是成功或者失败。
* ajaxStop (global) ：如果这是最后一个活跃着的 Ajax 请求，将会被触发。

### ajax 数据过滤器

对请求返回的结果进行过滤 ( 该方法仅在 ajax 请求中使用，jsonp 无效 )

```javascript
dataFilter:function(data,type){
  return JSON.parse(data).s
},
```

### 默认设置

```javascript
$.ajaxSettings = {
  // Default type of request
  type: "GET",
  // Callback that is executed before request
  beforeSend: empty,
  // Callback that is executed if the request succeeds
  success: empty,
  // Callback that is executed the the server drops error
  error: empty,
  // Callback that is executed on request complete (both: error and success)
  complete: empty,
  // The context for the callbacks
  context: null,
  // Whether to trigger "global" Ajax events
  global: true,
  // Transport
  xhr: function() {
    return new window.XMLHttpRequest();
  },
  // MIME types mapping
  // IIS returns Javascript as "application/x-javascript"
  accepts: {
    script: "text/javascript, application/javascript, application/x-javascript",
    json: jsonType,
    xml: "application/xml, text/xml",
    html: htmlType,
    text: "text/plain"
  },
  // Whether the request is to another domain
  crossDomain: false,
  // Default timeout
  timeout: 0,
  // Whether data should be serialized to string
  processData: true,
  // Whether the browser should be allowed to cache GET responses
  cache: true,
  // 处理ajax请求的响应值，需要返回经过处理的数据（方法的第一个参数data,类型是string，如果需要，通过JSON.parse转换）
  dataFilter: empty
};
```

### 工具函数

* mimeToDataType 设置 dataType
* appendQuery 将查询函数拼接到 url 上
* $.param 调用 serialize 函数，将 data 对象转成字符串，用 & 符号连接
* serializeData `options.data`转字符串 , 如果是 get 或者 jsonp，将 data 字符串拼
  接到 url 上
* parseArguments 整合参数，在`$.get,$.post,$.getJSON`等类似快捷方式的地方使用
* $.fn.load 当请求的 url 为 html 页面时，吐出页面
* serialize 将 data 的键值对转成[key=value]的数组

## 暴露的方法

核心方法就是`$.ajax`和`$.ajaxJSONP`，`$.get,$.post,$.getJSON`均为经过配置后的ajax方法，故不做详细描述
```javascript
$.ajax = function(options) {};
$.ajaxJSONP = function(options, deferred) {};
```

### $.ajax

#### 合并配置信息
#### 触发 ajaxStart 钩子
#### 根据 url 来设置 crossDomain 的值

* 如果 url 和 location.host 相等，则 crossDomain 为 false
* tip：创建个 a 元素，通过 a 元素的 href 来获取调用 url 的 host

```javascript
urlAnchor = document.createElement("a");
urlAnchor.href = settings.url;
settings.crossDomain =
  originAnchor.protocol + "//" + originAnchor.host !==
  urlAnchor.protocol + "//" + urlAnchor.host;
```

#### 调用 serializeData 函数，将`options.data`转字符串 , 如果是 get 或者 jsonp，将data 字符串拼接到 url 上

根据条件内部调用 $.param 和 appendQuery 函数

* tip: 拼接后的 url 时先不用管是否是第一个参数，将字符串拼接完成后再把第一个 &
  修改为？

```javascript
function appendQuery(url, query) {
  if (query == "") return url;
  return (url + "&" + query).replace(/[&?]{1,2}/, "?");
}
```

#### cache

如果 cache 设置为 false 或者 dataType 类型是 script 或 jsonp, 则通过在 url 上拼
接`_= 时间戳`不使用浏览器缓存

#### jsonp

如果 dataType=jsonp, 则在 url 最后拼接 callback=?，传入 setting 返回 $.ajaxJSONP
方法，后面详细介绍

#### 设置 header 值

#### ajax状态监听函数`onreadystatechange`

`xhr.readyState==4`

| 值  | 状态              | 描述                                              |
| --- | ---------------- | ------------------------------------------------- |
| 0   | UNSENT           | 代理被创建，但尚未调用 open() 方法。              |
| 1   | OPENED           | open() 方法已经被调用。                           |
| 2   | HEADERS_RECEIVED | send() 方法已经被调用，并且头部和状态已经可获得。 |
| 3   | LOADING          | 下载中； responseText 属性已经包含部分数据。      |
| 4   | DONE             | 下载操作已完成。                                  |

#### 触发 ajaxBeforeSend 钩子

如果 ajaxBeforeSend 返回 false 则中断 ajax 请求 , 触发 ajaxError 钩子（内部触发 ajaxComplete 钩子 -》ajaxStop 钩子）

#### 设置 async 属性
#### 执行 xhr.open, 触发 xhr.onreadystatechange(readyState 切换为 1)

`xhr.open(settings.type, settings.url, async, settings.username,
settings.password)`

#### 调用`nativeSetHeader`方法，设置xhr的header头
#### 如果timeout>0,开启超时的定时器，如果超过时间，触发中断方法
#### 执行xhr.send方法发送数据请求-》（触发 xhr.onreadystatechange(readyState 切换为 2->3->4)）

#### 当请求的状态为下载完成时，清空对请求状态的监听，并清除超时定时器
#### 对xhr进行解析
```javascript
// 成功的请求状态，对协议为file的情况进行特殊判断
if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
  // 设置dataType
  dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'))

  // 根据responseType返回不同的字段
  if (xhr.responseType == 'arraybuffer' || xhr.responseType == 'blob')
    result = xhr.response
  else {
    result = xhr.responseText

    try {
      // 对数据进行过滤操作，并根据不同的dataType 返回不同的结果
      result = ajaxDataFilter(result, dataType, settings)
      if (dataType == 'script')    (1,eval)(result)
      else if (dataType == 'xml')  result = xhr.responseXML
      else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
    } catch (e) { error = e }

    if (error) return ajaxError(error, 'parsererror', xhr, settings, deferred)
  }

  ajaxSuccess(result, xhr, settings, deferred)
} else {
  ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred)
}
```

#### 请求成功则逐步触发 ajaxSuccess->complete->stop，失败则触发 ajaxError->complete->stop

- 执行 ajaxSuccess
先调用 success 方法，再触发全局的 ajaxSuccess 钩子

- 执行 ajaxComplete
调用 complete 方法，再触发全局的 ajaxComplete 钩子

- 执行 ajaxStop
触发全局的 ajaxStop 钩子

---

### $.ajaxJSONP

```javascript
$.ajaxJSONP = function(options, deferred) {
  // ajaxJSONP方法容错，如果没有传入type，则走原始的ajax方法
  if (!("type" in options)) return $.ajax(options);
  // 指定callbackName,如果传入的jsonpCallback为函数，则callbackName为函数返回值
  // 不然就是字符串，如果不传，则是Zepto+时间戳
  var _callbackName = options.jsonpCallback,
    callbackName =
      ($.isFunction(_callbackName) ? _callbackName() : _callbackName) ||
      "Zepto" + jsonpID++,
    script = document.createElement("script"),
    // 将原始的回调暂存，防止变量重名覆盖
    originalCallback = window[callbackName],
    responseData,
    // 异常处理
    abort = function(errorType) {
      $(script).triggerHandler("error", errorType || "abort");
    },
    xhr = { abort: abort },
    abortTimeout;

  if (deferred) deferred.promise(xhr);

  $(script).on("load error", function(e, errorType) {
    // 只要脚本读取完成或者触发了error事件，则立即清除超时的定时器
    clearTimeout(abortTimeout);
    // 取消事件绑定，使监听只执行一次
    $(script)
      .off()
      .remove();

    if (e.type == "error" || !responseData) {
      ajaxError(null, errorType || "error", xhr, options, deferred);
    } else {
      // 将脚本内的数据传给success方法
      ajaxSuccess(responseData[0], xhr, options, deferred);
    }

    // 还原覆盖前的回调方法，如果存在，则将脚本返回的数据传入，再执行一次
    window[callbackName] = originalCallback;
    if (responseData && $.isFunction(originalCallback))
      originalCallback(responseData[0]);

    // 数据重置
    originalCallback = responseData = undefined;
  });

  // 触发ajaxBeforeSend钩子函数
  if (ajaxBeforeSend(xhr, options) === false) {
    abort("abort");
    return xhr;
  }

  // 将返回值放入responseData
  window[callbackName] = function() {
    responseData = arguments;
  };

  // 转换路径，将callbackName放入url末尾
  script.src = options.url.replace(/\?(.+)=\?/, "?$1=" + callbackName);
  // 插入脚本
  document.head.appendChild(script);

  // 超时处理
  if (options.timeout > 0)
    abortTimeout = setTimeout(function() {
      abort("timeout");
    }, options.timeout);

  return xhr;
};
```
