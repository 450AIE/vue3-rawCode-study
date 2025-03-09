export function isObject(obj){
    return typeof obj === 'object' && obj !== null
}

export function isFunction(val){
    return typeof val === 'function'
}

export const isArray = Array.isArray

// 用于标识当前虚拟节点是什么类型，组件，文本等等
// 组合开关可以表示类型
// 位运算适合权限的组合
/**
 * 详情笔记见siyuan
 */
export const enum ShapeFlags {
    ELEMENT = 1
    FUNCTION_COMPONENT = 1 << 1
    STATEFUL_COMPONENT = 1 << 2
    TEXT_CHILDREN = 1 << 3
    ARRAY_CHILDREN = 1 << 4
    SLOTS_CHILDREN = 1 << 5
    TELEPORT = 1 << 6
    SUSPENSE = 1 << 7
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8
    COMPONENT_KEPT_ALIVE = 1 << 9
    // 这里的 | 不是TS的类型聚合，是二进制运算，这里结果为6
    // & COMPONENT可以用来判断是否是FUNCTION_COMPONENT  or  STATEFUL_COMPONENT
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTION_COMPONENT
}
export const hasOwnProperty =(val,key)=> Object.prototype.hasOwnProperty.call(val,key)

export function invokeArrayFns = (fns){
    for(let i=0;i<fns.length;++i){
        fns[i]()
    }
}