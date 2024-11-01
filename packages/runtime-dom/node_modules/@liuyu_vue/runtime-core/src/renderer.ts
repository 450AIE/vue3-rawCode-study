import { ShapeFlags } from "@my_vue/shared/src"
import { isString } from "lodash"
import { createVnode, isSameVnode } from "./vnode"
import { patchProps } from "@my_vue/runtime-dom/src/patchProps"
import { reactive } from "vue"
import { ReactiveEffect } from "@my_vue/reactivity/src/effect"
import { hasOwnProperty } from "."
import { createComponentInstance, setupComponent, setupRenderEffect } from "./componenet"
export const Text = Symbol('Text')
export const Fragment = Symbol('Fragment')



export function createRender(renderOptions) {
    // 重新命名避免误认为是DOM操作自己的API
    // 取出用户传递的操作DOM的API
    let {
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElement,
        setText: hostSetText,
        querySelector: hostQuerySelector,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        createElement: hostCreateElement,
        createText: hostCreateText,
        patchProps: hostPatchProp
    } = renderOptions

    function mountChildren(children, container) {
        for (let i = 0; i < children.length; i++) {
            // 如果是字符串则转化为vnode形式
            let child = normalize(children[i])
            patch(null, chilren[i], container)
        }
    }

    function normalize(child) {
        // 如果是字符串，则转化为vnode形式
        if (isString(child)) {
            return createVnode(Text, null, child)
        }
        return child
    }

    function mountElement(vnode, container) {
        let { type, props, children, shapeFlag } = vnode
        // 1.创建父元素
        vnode.el = hostCreateElement(type)
        // 2. 循环挂载属性，事件
        if (props) {
            for (let key in props) {
                // 因为是创建，所以以前的propKey为null
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 3. 处理子节点
        // 是文本节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetText(children)
            // 是数组
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(children, el)
        }
        // 4. 将创建的父元素挂载到container容器里
        hostInsert(el, container)
    }

    function processText(n1, n2, container) {
        // n1没有代表要初始化文本
        if (n1 == null) {
            // 创建文本节点
            n2.el = hostCreateText(n2.children)
            // 插入文本节点
            hostInsert(n2.el, container)
            // n1, n2都是文本
        } else {
            // 复用节点
            n2.el = n1.el
            // 文本内容不同，设置为最新的n2的文本
            if (n1.children !== n2.children) {
                hostSetText(el, n2.children)
            }
        }
    }

    function patchProps(oldProps, newProps, el) {
        for (let key in newProps) {
            hostPatchProp(el, key, oldProps[key], newProps[key])
        }
        for (let key in oldProps) {
            // 新节点没有但老节点有的，从新节点中删除
            if (newProps[key] == null) {
                hostPatchProp(el, key, oldProps[key], null)
            }
        }
    }
    // 比较两个虚拟节点儿子的差异，el为父节点
    function patchChildren(n1, n2, el) {
        const c1 = n1 && n1.children
        const c2 = n2 && n2.children
        // 儿子可能是文本   数组  null

    }

    // 先复用节点，再比较属性，再比较儿子
    function patchElement(n1, n2) {
        // 1. 复用节点
        let el = n2.el = n1.el
        // 2.比较属性
        let oldProps = n1.props || {}
        let newProps = n2.props || {}
        // 对比更改el的属性
        patchProps(oldProps, newProps, el)
        // 3. 比较孩子
        patchChildren(n1, n2, el)
    }

    function processElement(n1, n2, container) {
        // n1老节点不存在，说明是初次挂载
        if (n1 == null) {
            mountElement(n2, container)
        } else {
            // 更新逻辑
            patchElement(n1, n2)
        }
    }
    function processFragment(n1, n2, container) {
        if (n1 == null) {
            mountElement(n2, container)
        } else {
            // why? diff对比
            patchElement(n1, n2)
        }
    }

    function shouldUpdateComponent(n1, n2) {
        const { props: prevProps, children: prevChildren } = n1
        const { props: nextProps, children: nextChildren } = n2
        if (prevProps === nextProps) return false
        // 其一有插槽就直接更新
        if (prevChildren || nextChildren) return true
        return hasPropsChanged(prevProps, nextProps)
    }

    // instance.props是响应式的，因为被shallowReactive()了，或者
    // 传递的本身就是ref或者reactive响应式的，并且因为后面new ReactiveEffect了，
    // 且传递的getter是render函数，会再次调用组件内的响应式数据和props，会收集
    // 依赖，数据变了从而触发调度器让组件额外处理后，再次render更新
    function updateComponent(n1, n2) {
        // 复用节点
        const instance = n2.component = n1.component
        if (shouldUpdateComponent(n1, n2)) {
            // next表示"将要更新为的vnode"，用于拿到最新数据
            instance.next = n2
            // 拿到最新数据后update
            instance.update()
        }
    }

    /**
     * 1. 创建组件实例
     * 2. 给组件实例赋属性和事件
     * 3. 创建effect
     */
    function mountComponent(vnode, container, anchor) {
        // 1
        let instance = vnode.component = createComponentInstance(vnode)
        // 2
        setupComponent(instance)
        // 3
        setupRenderEffect(instance, container, anchor)
    }

    function processComponent(n1, n2, container, anchor) {
        if (n1 == null) {
            // 初次挂载
            mountComponent(n2, container, anchor)
        } else {
            // 组件更新props
            updateComponent(n1, n2)
        }
    }

    // n1为老节点，n2为新节点。n2可能是文本字符串
    // 将n1和n2  diff比对，然后将修改后的vnode挂载到container上
    function patch(n1, n2, container, anchor = null) {
        if (n1 === n2) return
        // 如果n1和n2不是一个东西，直接替换
        if (n1 && !isSameVnode(n1, n2)) {
            unmount(n1)
            // n1设置为null就会走下面的初次挂载逻辑
            n1 = null
        }
        const { type, shapeFlag } = n2
        // 走到这里说明n1为null或者n1和n2为相同类型
        switch (type) {
            // 处理文本类型 
            case Text:
                processText(n1, n2, container)
                break
            case Fragment: // <></>标签
                processFragment(n1, n2, container)
                break
            default:
                // 是其他元素
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    processComponent(n1, n2, container, anchor)
                }
        }
    }
    // 卸载的可能是组件，文本等等
    function unmount(vnode) {
        hostRemove(vnode.el)
    }

    // vnode为传递的最新的虚拟vnode
    function render(vnode, container) {
        // 调用render(null,container)就是把container内部的html清空
        if (vnode == null) {
            // 卸载逻辑
            // container容器本来就存在vnode，就卸载
            if (container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 既可以初始化，又可以更新
            // 如果同一个容器第二次被render，才会改变._vnode
            patch(container._vnode || null, vnode, container)
        }
        // ._vnode每次都保存上一次的状态，便于比较
        container._vnode = vnode
    }
    return {
        render
    }
}