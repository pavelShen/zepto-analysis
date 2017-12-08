//     Zepto.js
//     (c) 2010-2016 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function(){
  // getComputedStyle shouldn't freak out when called
  // without a valid element as argument
  // 重写getComputedStyle方法,当方法的第一个element元素不存在时，通过try-catch捕获，返回null,从而使得脚本能继续执行
  try {
    getComputedStyle(undefined)
  } catch(e) {
    var nativeGetComputedStyle = getComputedStyle
    window.getComputedStyle = function(element, pseudoElement){
      try {
        return nativeGetComputedStyle(element, pseudoElement)
      } catch(e) {
        return null
      }
    }
  }
})()