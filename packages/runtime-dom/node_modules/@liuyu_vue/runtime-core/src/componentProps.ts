import { hasOwnProperty } from "."

// 实例，用户传递的props
export function initProps(instance,rawProps){
    const props = {}
    const attrs = {}
    const options = instance.propsOptions || {}
    // 如果用户传递了props
    if(rawProps){
        for(let key in rawProps){
            const value = rawProps[key]
            // 如果组件有设置这个props，那么就赋值到这个组件
            // 的props上
            if(hasOwnProperty(options,key)){
                props[key] = value
            // 否则赋值到组件的attrs上
            }else{
                attrs[key] = value
            }
        }
    }
    // props不希望被子组件修改，但是得是响应式的，
    // 用来保证属性变化后更新视图
    // 传递的props如果是ref，那么会在
    // template中自动.value，传递的内部的值，就不是响应式
    // 的了，但是传递reactive呢？应该还是响应式的吧
    instance.props = shallowReactive(props)
    instance.attrs = attrs
}