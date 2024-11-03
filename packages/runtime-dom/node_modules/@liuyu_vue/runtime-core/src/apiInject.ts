import { currentInstance } from "./componenet";


// 每个组件自己保存的provides都是给子组件使用的，自己组件使用inject是获取
// 父组件上的provides

// 这两个依赖注入只可以用到setup中
export function inject(key) {
    // 当前没有实例说明不是在setup语法中调用
    if(!currentInstance) return
    // 获取父亲上的provides属性
    const provides = currentInstance.parent && currentInstance.parent.provides
    // provides属性存在并且想要获取的key在provides上，就返回
    if(provides && (key in provides)){
        return provides[key]
    }
}

export function provide(key, value) {
    // 当前没有实例说明不是在setup语法中调用
    if (!currentInstance) return
    const parentProvides = currentInstance.parent && currentInstance.parent.provides
    let provides = currentInstance.provides
    // 子组件默认继承父组件的属性，如果和父组件一样代表子组件是继承来的，需要再create一份
    // 避免对父组件的provides的影响。Object.create相当于继承，传递的参数作为原型，当父组件
    // 的provides改变时，通过原型链可以找到改变后的父组件属性
    if (parentProvides === provides) {
        provides = currentInstance.provides = Object.create(provides)
    }
    // 给当前组件的实例provides加上这个属性，避免影响父组件
    provides[key] = value
}