import { isFunction, isObject } from "lodash";
import { initProps } from './componentProps';
import { hasOwnProperty } from '.';
import { queueJob } from './../../runtime-dom/node_modules/@liuyu_vue/runtime-core/src/scheduler';
import { proxyRefs } from './../../reactivity/src/ref';

export function createComponentInstance(vnode) {
    // vue3创建组件实例来挂载，要保存信息
    const instance = {
        data: null,
        vnode,  // 组件本身的vnode，保存组件的各种信息
        subTree: null, // 组件要渲染的内容，也是vnode，渲染的时候
        // 也是拿subTree来patch渲染
        isMounted: false,
        update: null,
        propsOptions: vnode.type.props, //这是什么
        props: {}, // 组件通信的props
        attrs: {}, //普通的属性，比如dataset-uid
        proxy: null,
        render: null,
        setupState: {} // setup的返回值
    }
    return instance
}

const publicProperty = {
    $attrs: (i) => i.attrs
}

const publicInstanceProxy = {
    get(target, key) {
        const { data, props, setupResult } = target
        // 这里的if和else if是取data和props的情况
        if (data && hasOwnProperty(data, key)) {
            return data[key]
        } else if (hasOwnProperty(setupResult, key)) {
            return setupResult[key]
        } else if (props && hasOwnProperty(props, key)) {
            return props[key]
        }
        // 走到这里说明使用的是this.$attrs.key的写法
        let getter = publicProperty[key]
        if (getter) {
            return getter(target)
        }
    }
    set(target, key, value) {
        const { data, props } = target
        // 这里的if和else if是取data和props的情况
        if (data && hasOwnProperty(data, key)) {
            data[key] = value
            return true
        } else if (hasOwnProperty(setupResult, key)) {
            setupResult[key] = value
            return true
        } else if (props && hasOwnProperty(props, key)) {
            // 用户操作的属性是代理镀锡，被屏蔽了，但是可以通过
            // instance.props拿到真实props
            console.warn('error')
            return true
        }
    }
}

export function setupComponent(instance) {
    let { props, type } = instance.vnode
    initProps(instance, props)
    // 这一行代码省略，不懂
    instance.proxy = new Proxy(instance, publicInstanceProxy)
    // 我们写的组件对象被传递给vnode.type，因为我们一般使用是
    // h['DIV',...]，组件的话就是h[VueComponent,....]，
    // 然后这个VueComponent就是含有data，函数等等的组件
    let data = type.data
    if (!isFunction(data)) return
    instance.data = reactive(data.call(instance.proxy))
    // 判断是否传递setup
    let setup = type.setup
    if (setup) {
        const setupContext = {}
        const setupResult = setup(instance.props, setupContext)
        // setup返回函数代表返回的是render函数
        if (isFunction(setupResult)) {
            instance.render = setupResult
        } else if (isObject(setupResult)) {
            // 取出.value
            instance.setupState = proxyRefs(setupResult)
        }
    }
    if (!instance.render) {
        instance.render = type.render
    }
}

export function setupRenderEffect(instance, container, anchor) {
    function updateComponentPreRender(instance, next) {
        // 使用完毕，可以清空了
        instance.next = null
        instance.vnode = null
        // 更新属性
        updateProps(instance.props, next.props)
    }
    // 组件更新函数
    function componentUpdateFn() {
        // 初始化
        if (!instance.isMounted) {
            const subTree = render.call(data)
            // 挂载subTree
            patch(null, subTree, container, anchor)
            instance.subTree = subTree
            instance.isMounted = true
        } else {
            // next为最新的数据，
            let { next } = instance
            if (next) {
                // 更新前拿到最新的属性来修改保存props，
                // 再让后面render可以拿到最新的props,
                // 因为是组件传递的，子组件用props字段保存了
                // 传递的props，也是用到自己保存的props字段
                // 为了保证数据一致要修改。而以前effect因为
                // 是直接使用自己内部的数据，再次取值就一定是
                // 新的，所以没有修改的步骤。区别在于属性是内部自己的，
                // 还是外部传递的
                updateComponentPreRender(instance, next)
            }
            // 组件内部更新，组件更新必须是异步的
            // render函数返回vnode
            const subTree = render.call(data)
            // 渲染container的内容，将新的subTree  (也是vnode)挂载
            patch(instance.subTree, subTree, container, anchor)
            instance.subTree = subTree
        }
    }
    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(instance.update))
    // 手动run让组件收集依赖并且更新
    effect.run()
    instance.update = effect.run.bind(effect)
}



export function updateProps(instance, prevProps, nextProps) {
    // 怎么算变化？  值变了，或属性个数变了
    if (hasPropsChanged(prevProps, nextProps)) {
        for (const key in nextProps) {
            instance.props[key] = nextProps[key]
        }
        for (const key in prevProps) {
            if (!hasOwnProperty(nextProps, key)) {
                nextProps[key] = null
            }
        }
    }
}

export function hasPropsChanged(prevProps = {}, nextProps = {}) {
    const nextKeys = Object.keys(nextProps)
    // props数量改变了，一定变化
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true
    }
    // 数量一样就比较对应props的值是否一样，或者有无不同的值
    for (let i = 0; i < nextKeys.length; ++i) {
        const key = nextKeys[i]
        // 有props不同
        if (nextKeys[key] !== prevProps[key]) {
            return true
        }
    }
    return false
}