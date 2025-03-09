import { isObject } from "@my_vue/shared/src";
import { mutableHandler, ReactiveFlags } from "./baseHandler";

// 用WeakMap缓存当前已经存在的reactive，避免被reactive代理的数据
// 再次被reactive，还可以防止内存泄漏
// k 是被代理的原数据data，v是代理后的proxy
export const reactiveMap = new WeakMap();

// 数据转换为响应式，reactive只可以代理对象
export function reactive(target) {
	// 只代理对象
	if (!isObject(target)) return;
	// 因为只有被代理了会走到proxy的if判断里面返回true，否则undefined
	// 这里为true，说明传递的target是被代理过的proxy
	if (target[ReactiveFlags.IS_REACTIVE]) return target;
	// 判断该target是否已经被reactive代理过了，就返回自己
	// 这里返回true，代表传递的是被代理过的原数据data
	if (reactiveMap.has(target)) return target;
	// proxy代理
	const proxy = new Proxy(target, mutableHandler);
	reactiveMap.set(target, proxy);
	return proxy;
}

// 如果是响应式的那么一定会进入get返回true
export function isReactive(val) {
	// !!转化为Boolean
	return !!(value && val[ReactiveFlags.IS_REACTIVE]);
}
