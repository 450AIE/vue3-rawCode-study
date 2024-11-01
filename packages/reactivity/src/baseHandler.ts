
import { isObject } from "@my_vue/shared/src"
import { activeEffect, track, trigger } from "./effect"
import { reactive } from "./reactive"
export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}
export function mutableHandler(){
    get(target,key,receiver){
        // 访问ReactiveFlags.IS_REACTIVE代表在确认是否该target
        // 已经被reacative代理过了
        if(key === ReactiveFlags.IS_REACTIVE) return true
        // 收集依赖
        track(target,'get',key)
        let res = Reflect.get(target,key,receiver)
        // 深度代理，只有取值为对象属性内的对象时才深度代理
        // 性能更好，比Vue2的一上来就递归代理完性能更好。
        // 之所以要深度代理，是因为proxy只会代理最外层的
        // 对象，访问对象内的对象时是不会被拦截的，所以要深度代理
        // 懒代理
        if(isObject(res)){
            return reactive(res)
        }
        return res
    },
    set(target,key,value,receiver){
        // 值没变，不用触发更新
        if(target[key] === value) return true
        else {
            // 值改变触发更视图更新
            trigger(target,'set',key,value,oldValue)
        }
        return Reflect.set(target,key,value,receiver)
    }
}