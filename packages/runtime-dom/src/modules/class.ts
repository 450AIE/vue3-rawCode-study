export function patchClass(el,nextValue){
    // class为空了，清除
    if(nextValue == null){
        el.removeAttribute('class')
    }else{
        // 改变，覆盖
        el.className = nextValue
    }
}