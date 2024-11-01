import { createRender } from "@my_vue/runtime-core/src";
import { nodeOps } from "./nodeOps";
import { patchProps } from "./patchProps";
const renderOptions = Object.assign(nodeOps,{patchProps})

export function render(vnode,container){
    createRender(renderOptions).render(vnode,container)
}

