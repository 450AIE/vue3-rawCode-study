import { isFunction } from "@my_vue/shared/src";
import { ReactiveEffect, trackEffects, triggerEffects } from "./effect";

// 计算属性类
class ComputedRefImpl {
    public effect
    // 脏值检测
    public _dirty = true
    public __v_isReadonly = true
    public __v_isRef = true
    public _value
    public dep = new Set()
    // 当计算属性，比如fullName使用时，fullName.value，
    // 就会调用get()收集依赖，所以getter就相当于effect
    // 的第一个参数，即用户传递的fn
    constructor(public getter,public setter){
        this.effect = new ReactiveEffect(getter,()=>{
            // 依赖的值变化就执行该调度函数
            if(!this._dirty){
                // 依赖的值变化了，脏值变为true，这样下次
                // fullNmae.value走get就会再次收集依赖
                this._dirty = true
                // 依赖的值变化，触发更新
                triggerEffects(this.dep)
            }
        })
    }
    get value(){
        // 收集依赖，当外层使用了计算属性时，计算属性的dep也会收集外层
        // 的effect
        trackEffects(this.dep)
        // 当前值是脏的
        if(this._dirty){
            this._dirty = false
            this._value = this.effect.run()
        }
        return this._value
    }
    set value(newValue){
        this.setter(newValue)
    }
}

export function computed(getterOrOptions){
    let getter
    let setter
    // 如果传递的是函数，那么就仅有getter
    if(isFunction(getterOrOptions)){
        getter = getterOrOptions
        setter = ()=>{}
    }else{
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    return new ComputedRefImpl(getter,setter)
}