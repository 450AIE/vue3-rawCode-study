import { ShapeFlags } from "@my_vue/shared/src";
import { isArray, isObject, isString } from "lodash";
import { isTeleport } from "./components/Teleport";

// 虚拟节点有  组件  元素  文本 等等
export function createVnode(type, props, children = null, patchFlag = 0) {
    /**
     * 判断该元素中包含一个儿子还是多个儿子，一个儿子就是
     * <div>
     *  <span>222</span>
     * </div>  这种,
     * 多个儿子就是
     * <div>
     *  <span>33</span>
     *  <span>33</span>
     * </div>  这种
     * 
     */
    // 如果传递的是字符串，那么就是传递的‘DIV’之类的
    // 如果传递的是type对象，那么就是传递的组件，type为组件的所有属性
    let shapeFlag = isString(type) ? ShapeFlags.ELEMENT :
        isTeleport(type) ? ShapeFlags.TELEPORT :
            isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0
    // vnode便于跨平台，直接对比真实DOM性能差，因为真实DOM的属性太多
    const vnode = {
        type,
        props,
        children,
        // vnode对应的真实DOM
        el: null,
        // diff对比的key
        key: props.key ? props.key : null,
        __v_isVnode: true,
        shapeFlag,
        // 标记是否有动态节点，有则只对比动态节点，
        // 优化性能。0为无，1为有
        patchFlag,
        // 存储动态节点的数组
        dynamicChildren: null,
    }
    // 如果有孩子的话，判断孩子的类型
    if (children) {
        let type = 0
        // 是数组则标记为数组
        if (isArray(children)) {
            type = ShapeFlags.ARRAY_CHILDREN
            // 孩子是对象时，代表是插槽
        } else if (isObject(children)) {
            type = ShapeFlags.SLOTS_CHILDREN
        } else {
            // 不是数组那么就是文本，用String避免传递的Number类型报错
            children = String(children)
            type = ShapeFlags.TEXT_CHILDREN
        }
        vnode.shapeFlag = vnode.shapeFlag | type
    }
    // vnode.patchFlag > 0表示要更新
    if (currentBlock && vnode.patchFlag > 0) {
        currentBlock.push(vnode)
    }
    return vnode
}


export function isVnode(value) {
    return !!(value && value.__v_isVnode)
}

// 判断两个虚拟节点是否是相同节点
// 如果key一样，标签名一样，那就相同
export function isSameVnode(n1, n2) {
    return (n1.type === n2.type) && (n1.key === n2.key)
}

let currentBlock = null


export function openBlock() {
    currentBlock = []

}

function setupBlock(vnode) {
    vnode.dynamicChildren = currentBlock
    currentBlock = null
    return vnode
}

export function createElementBlock(type, props, children, patchFlag) {
    return setupBlock(createVnode(type, props, children, patchFlag))
}

export function isDisplayString() {

}

export function toDisplayString(val) {
    return isString(val) ? val : val == null ? '' : JSON.stringify(val)
}