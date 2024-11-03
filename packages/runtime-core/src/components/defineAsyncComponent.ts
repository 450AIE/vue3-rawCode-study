import { Fragment } from "vue"
// 异步加载组件，传递的options建议是对象
export function defineAsyncComponent(options) {
    // 全部包成对象，更丰富的属性
    if (typeof options === 'function') {
        options = { loader: options }
    }
    return {
        setup() {
            const { loader, timeout, loading, delay,loadingComponent,onError,errorComponent } = options
            // 标记状态
            const error = ref(false)
            const loaded = ref(false)
            const loading = ref(false)
            // delay时间后展示loading状态
            if (delay) {
                setTimeout(() => {
                    loading = true
                }, delay)
            }
            // 保存请求成功后的组件
            let Comp = null
            function load(){
                // 如果异步加载组件失败，且传递了onError，就执行
                return loader().catch(err=>{
                    if(onError){
                        return new Promise((resolve,reject)=>{
                            // 执行retry就重新执行loader函数
                            const retry = ()=>resolve(load())
                            const fail = ()=>reject(err)
                            onError(err,retry,fail)
                        })
                    }
                })
            }
            // 组件异步加载成功就挂载
            load().then(c => {
                Comp = c
                loaded.value = true
            }).catch(err => error.vlaue = err).finally(() => {
                loading.value = false
            })
            // 超出设定的时间就挂载err组件
            setTimeout(() => {
                error.value = true
            }, timeout)
            render(){
                return () => {
                    // 正确渲染
                    if (loaded.value) {
                        return h(Comp)
                        // err组件
                    } else if (error.value && errorComponent) {
                        return h(errorComponent)
                        // loading组件
                    }else if(loading.value){
                        return h(loadingComponent)
                    }
                    // 没传递loading组件和err组件，先渲染空
                    return h(Fragment, [])
                }
            }
        }
    }
}