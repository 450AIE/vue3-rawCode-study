export let activeEffectScope = null
export class EffecScope {
    active = true
    parent = null
    // 收集内部的effect
    effects = []
    // 收集内层的effectScope
    scopes = []
    // 传递这个true就让外层的effectScope不收集内部的effectScope
    constructor(detached?){
        // 如果自己不独立就会被activeEffectScope收集
        if(!detached && activeEffectScope){
            activeEffectScope.scopes.push(this)
        }
    }
    run(fn){
        if(this.active){
            this.parent = activeEffectScope
            activeEffectScope = this
            // fn里面也有effect，会让内部的effect也run
            let res =  fn()
            activeEffectScope = null
            this.parent = null
            return res
        }
    }
    // 将所有收集的effect和effectScope  stop了，effectScope
    // stop会一直触发去stop所有内层的effect
    stop(){
        if(this.active){
            for(let i=0;i<this.effects.length;++i){
                this.effects[i].stop()
            }
            for(let i=0;i<this.scopes.length;++i){
                this.scopes[i].stop()
            }
            this.active = false
        }
    }
}
export function recordEffectScope(effect){
    if(activeEffectScope && activeEffectScope.active){
        activeEffectScope.effects.push(effect)
    }
}

export function effectScope(detached = false){
    return new EffectScope(detached)
}