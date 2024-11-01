// DOM的增删查改
export function nodeOps(){
    insert(child,parent,anchor = null){
        parent.insertBefore(child,anchor)
    }
    remove(child){
        const parentNode = child.parentNode
        if(parentNode){
            parentNode.removeChild(child)
        }
    }
    // innerHTML可以执行JS脚本，很危险，用textContent
    setElementText(el,text){
        el.textContent = text
    }
    setText(node,text){
        node.nodeValue = text
    }
    querySelector(selector){
        return document.querySelector(selector)
    }
    parentNode(node){
        return node.parentNode
    }
    nextSibling(node){
        return node.nextSibling
    }
    createElement(tagName){
        return document.createElement(tagName)
    }
    createText(text){
        return document.createTextNode(text)
    }
}