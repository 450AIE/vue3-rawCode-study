export const TeleportImpl = {
    __isTeleport:true,
    process(n1,n2,container,internals){
        // 初次挂载
        if(!n1){
            const target = document.querySelector(n2.props.to)
            if(target){
                mountChildren(n2.children,target)
            }
        // 更新逻辑
        }else{
            // 内容对比修改，如果位置改变了那么n1的vnode也就
            patchChildren(n1,n2,container)
            // 位置改变
            if(n2.props.to !== n1.props.to){
                // 位置改变后获取下一个位置，并一个个挂载
                const nextTarget = document.querySelector(n2.props.to)
                n2.children.forEach(child=>move(child,nextTarget))
            }
        }
    }
}

export const isTeleport = (type) => type.__isTeleport