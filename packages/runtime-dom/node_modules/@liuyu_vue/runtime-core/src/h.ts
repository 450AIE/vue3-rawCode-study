// 给用户使用

import { isArray } from "@my_vue/shared/src"
import { createVnode, isVnode } from "./vnode"
import { isObject } from "lodash"

/**
 * 可能出现的写法：
 * h('div',{xxx})
 * h('div',{xxx},'hello')
 * h('div','hello')
 * h('div',null,'hello','world')
 * h('div',null,h('span'))
 * h('div',null,[h('span'),h(...).....])
 * 传递的第三个及其以后的必定被视作孩子
 */
// h函数只是对createVnode封装
export function h(type,propsChildren,children){
    // 传递的参数个数
    const l = arguments.length
    // 只传递两个形参的话，propsChildren就是children元素
    if(l === 2){
        if(isObject(propsChildren) && !isArray(propsChildren)){
            if(isVnode(propsChildren)){
                return createVnode(type,null,[propsChildren])
            }
            return createVnode(type,propsChildren)
        }else{
            // 是数组，直接传递
            return createVnode(type,null,propsChildren)
        }
    }else{
        if(l >3){
            // 提取第三个及以后的参数为children
            children = Array.from(arguments).slice(2)
            // 对应的情况是 h ('div',{},h('span'))
        }else if(l === 3 && isVnode(children)){
            children = [children]
        }
        // 此时children可能是   文本  or  数组
        return createVnode(type,propsChildren,children)
    }
}