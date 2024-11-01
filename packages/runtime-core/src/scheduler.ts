// 渲染队列
const queue = []
let isFlushing = false

// 用Promise微任务保证同步执行完后异步更新，Promise.resolve()
// 返回一个success的Promise，可以用来多次then，用来执行微任务
function resolvePromise = Promise.resolve()

// 缓存组件内响应式数据的更新，避免更新一个就组件重新
// 渲染一次
// 组件的异步更新
export function queueJob(job){
    // 同一个组件只存放一个更新
    if(!queue.includes(job)){
        queue.push(job)
    }
    if(!isFlushing){
        isFlushing = true
        // 只选取当前有的queue，避免在执行的时候有新的job加入queue
        let copy = queue.slice(0)
        resolvePromise.then(()=>{
            for(let i=0;i<copy.length;++i){
                queue[i]()
            }
            isFlushing = false
        })
        // 清空
        queue.length = 0
        copy.length = 0
    }
}