import { patchAttr } from "./modules/attr"
import { patchClass } from "./modules/class"
import { patchEvent } from "./modules/event"
import { patchStyle } from "./modules/style"

// 增删改查DOM的属性
/**
 * 可能的情况有
 * 值A  值B
 * 值A  值A
 * null 值A
 * 值A  null
 */
export function patchProps(el,key,preValue,nextValue){
    // 类名  el.className
    if(key === 'class'){
        patchClass(el,nextValue)
    }else if(key === 'style'){
    // 样式 el.style
        patchStyle(el,preValue,nextValue)
    }eles if(/^on[^a-z]/.test(key)){
    // 事件 events
        patchEvent(el,key,nextValue)
    }else{
    // 其他属性
        patchAttr(el,key,nextValue)
    }    
}