export function patchEvent(el,eventName,nextValue){
    // vei代表事件调用
    let invoker = el_vei || (el.vei = {})
    // 判断是否该事件存在了，存在的话，exits为对应的事件
    let exits = invokers[eventName]
    // 已经绑定了事件了，直接改造绑定的invoker.value即可
    if(exits && nextValue){
        exits.value = nextValue
    // 如果没有绑定事件就绑定事件
    }else{
        // 事件名，传递的eventName是onClick，所以要变为click
        let event = eventName.slice(2).lowerCase()
        if(nextValue){
            const invoker = invoker[eventName] = createInvoker(nextValue)
            el.addEventListener(event,invoker)
        }else if(exits){
            // 如果有老的绑定事件，并且这次传递的事件为null
            // 直接移除
            el.removeEventListener(event,exits)
            invokers[eventName] = undefined
        }
    }
}

// 这样如果绑定的事件改变，就不用解绑再绑定，这样浪费性能，
// 绑定一个A函数，A.value才是绑定的事件，直接改变A.value
// 就可以改变绑定的事件了
function createInvoker(cb){
    const invoker = (e)=> invoker.value()
    invoker.value = cb
    return invoker
}