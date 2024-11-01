// pre是之前的style，next是之后的style
export function patchStyle(el,preValue,nextValue){
    // style逐个更新为最新值
    for(let key in nextValue){
        el.style[key] = nextValue[key]
    }
    // 之后传递的style可能是{fontSize:'99px}，然后之前是
    // {color:'red'}这种，上面只赋值了之后的值，但是还需要
    // 清除nextValue中不存在的样式key
    if(preValue){
        for(let key in preValue){
            // 不存在，设置为null
            if(nextValue[key] == null){
                el.style[key] = null
            }
        }
    }
}