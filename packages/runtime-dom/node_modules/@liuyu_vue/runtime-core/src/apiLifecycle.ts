import { currentInstance, setCurrentInstance } from "./componenet"

export const enum LifecycleHooks {
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm',
    BEFORE_UPDATE = 'bu',
    UPDATED = 'u'
}


/**
 * 比如 onMounted(()=>{})，里面的函数就是传递的hook
 */
function createHook(type){
    // hook需要绑定到对应的逻辑上
    // setup中会挂载当前的instance，可以用此
    // 获取当前的组件实例
    return (hook,target = currentInstance)=>{
        // 如果当前有实例就关联记住，避免用户
        // 在非setup中使用生命周期API
        if(target){
            // 拿到实例上我们写的type类型的生命周期函数的所有调用
            const hooks = target[type] || (target[type] = [])
            const wrappedHook = ()=>{
                // 调用hook之前设置组件instance为当前组件，
                // 避免instance指向的改变
                // 闭包，target永远一个
                setCurrentInstance(target)
                hook()
                setCurrentInstance(null)
            }
            // 稍后执行hooks内的函数
            hooks.push(wrappedHook)
        }
    }
}
// 工厂模式
export const onBeforeMount => createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted => createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate => createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated => createHook(LifecycleHooks.UPDATED)