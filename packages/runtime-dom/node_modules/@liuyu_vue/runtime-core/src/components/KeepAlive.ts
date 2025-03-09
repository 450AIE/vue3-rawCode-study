import { onMounted, onUpdated } from "vue"
import { ShapeFlags } from "../../../shared/src"
import { isVnode } from "../vnode"



export const KeepAliveImpl = {
    __isKeepAlive: true,
    // 这些这里没有实现
    props: {
        include: {}, //缓存的组件名
        exclude: {},  // 不缓存的组件名
        max: {}      // max最大个数，采用LRU策略，删除缓存后重置被删除的组件的状态
    }
    setup(props, slots) {
        // 缓存的key
        const keys = new Set()
        // 保存哪个key对应哪个vnode
        const cache = new Map()
        const instance = getCurrentInstance()
        let { createElement, move } = instance.ctx.renderer
        // 稍后将渲染好的组件移入div中缓存
        const storageContainer = createElement('div')
        // 在patch里的unmount时，我们就阻止unmount，取而代之
        // 将这个组件vnode放在storageContainer缓存里准备取出来用
        instance.ctx.deactivate = function (vnode) {
            move(vnode, storageContainer)
            // 这里还有deactivate的生命周期
        }
        instance.ctx.activate = function (vnode, container, anchor) {
            move(vnode, container, anchor)
            // 这里还有activate的生命周期
        }
        // 表示当前活跃的组件
        let pendingCacheKey = null
        // 更新当前活跃组件的subTree虚拟节点
        function cacheSubTree() {
            if (pendingCacheKey) {
                cache.set(pendingCacheKey, instance.subTree)
            }
        }
        onMounted(cacheSubTree)
        onUpdated(cacheSubTree)
        return () => {
            let vnode = slots.default()
            // 只缓存组件
            if (!isVnode(vnode) || !(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)) return vnode
            const comp = vnode.type
            // vnode没有key就用组件本身当key
            const key = vnode.key == null ? comp : vnode.key
            // 缓存中获取
            const cacheVnode = cache.get(key)
            if (cacheVnode) {
                // 缓存中存在，直接复用
                vnode.component = cacheVnode.component
                // 表示已经被缓存过了，不用再diff对比修改创建了
                vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.COMPONENT_KEPT_ALIVE
            } else {
                // 缓存没找到，没有缓存过，就缓存这个组件的key
                keys.add(key)
                pendingCacheKey = key
            }
            // 标记这个，避免被卸载，因为要缓存
            vnode.shapeFlag = vnode.shapeFlag | ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
            return vnode
        }
    }
}

export function isKeepAlive = (vnode) => vnode.type.__isKeepAlive