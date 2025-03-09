import { isArray, isObject } from "@my_vue/shared/src"
import { reactive } from "./reactive"
import { trackEffects, triggerEffects } from "./effect"


class RefImpl {
    // 外层使用了这个ref，同样会被ref收集依赖
    public dep = new Set()
    // ref内的_value其实就是reactive
    public _value
    public __v_isRef = true
    constructor(public rawValue){
        this._value = toReactive(rawValue)
    }
    get value(){
        // 外层使用了这个ref，同样会被ref收集依赖
        trackEffects(this.dep)
        return this._value
    }
    set value(newValue){
        // newValue和this.rawValue都是原始值，不用.value比对
        if(newValue !== this.rawValue){
            // 避免 ( = 对象 )失去响应式，所以再次toReactive()
            this._value = toReactive(newValue)
            this.rawValue = newValue
            // 通知依赖的effect更新，含有外层的effect，视图等
            triggerEffects(this.dep)
        }
    }
}

// 只做了如下操作:
// const {name, age} = toRefs(state)  如果直接 = state 那么name和age会失去响应式
// 将state的所有属性创建ObjectRefImpl类，然后就可以name.value样，相当于调用state.name
// 因此保留响应式，也没有额外修改，只是代理了一下
class ObjectRefImpl {
    constructor(public object,public key){
        
    }
    get value(){
        return this.object[key]
    }
    set value(newValue){
        this.object[this.key] = newValue
    }
}


// 是对象则变为响应式，proxy代理
function toReactive(rawValue){
    return isObject(value) ? reactive(value) : value
}

export function ref(value){
    return new RefImpl(value)
}

function toRef(object,key){
    return new ObjectRefImpl(object,key)
}

// 仅仅是将object所有的属性代理了一遍，让比如name.value可以访问state.name原罢了
// 像之前用pinia解构一样，也是用toRefs保持响应式
export function toRefs(object){
    const result = isArray(object) ? new Array(object.length) : {}
    for(let key in object){
        result[key] = toRef(object,key)
    }
    return result
}

// 通过这个API，用户就可以省去.value的步骤
export function proxyRefs(object){
    return new Proxy(object,{
        get(target,key,receiver){
            let r = Reflect.get(target,key,receiver)
            // 是ref就自动返回.value
            return r.__v_isRef ? r.value : r
        }
        set(target,key,value,receiver){
            let oldValue = target[key]
            if(oldValue.__v_isRef){
                oldValue.value = value
                return true
            }else{
                retrun Reflect.set(target,key,value,receiver)
            }
        }
    })
}