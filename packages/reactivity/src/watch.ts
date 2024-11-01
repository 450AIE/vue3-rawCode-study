import { isFunction, isObject } from "@my_vue/shared/src";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";

// source是传入的对象，要监听的数据(可能是函数)
export function watch(source,cb){
    // getter就是要监听的数据
    let getter
    if(isReactive(source)){
        // 对传入的数据进行递归循环访问所有属性，收集全部属性的依赖
        getter = ()=> traversal(source)
    }else if(isFunction(source)){
        getter = source
    }else{
        return
    }
    // 上一次的watch内的函数
    let cleanup
    function onCleanup(fn){
       cleanup = fn 
    }
    let oldValue
    // 调度器函数，数据变化后run拿到最新值
    function job(){
        // 如果设置了cleanup，那么下一次执行watch内函数会先执行
        // cleanup内的函数.
        // ***因为这个cleanup在这次cb()之前调用，所以只影响上一次的watch
        // 内函数的执行***
        if(cleanup) cleanup()
        const newValue = effect.run()
        // 执行watch内写的函数
        cb(newValue,oldValue,onCleanup)
        oldValue = newValue
    }
    const effect = new ReactiveEffect(getter,job)
    // 执行一次就是获取要监听的数据
    oldValue = effect.run()
}

// 循环遍历对象，触发getter收集依赖
// 注意循环引用的问题，避免死循环
// 所以使用watch的时候，如果不需要监听整个对象，
//第一个参数写()=>函数返回某个属性性能更好，因为
// 这样就不用遍历收集整个对象字段了
function traversal(value,set = new Set()){
    if(!isObject(value)) return value
    // 如果该属性已经被遍历过了就直接返回
    if(set.has(value)) return value
    set.add(value)
    for(let key in value){
        traversal(value[key],set)
    }
}

