import { recordEffectScope } from "./effectScope";

// 当前活跃的effect，用来收集依赖，类似vue2的全局Dep
export let activeEffect = undefined;
export class ReactiveEffect {
	// 收集依赖的属性，k为对象的key，val为该对象属性依赖的effect  Set集合
	public deps = [];
	// 父节点effect
	public parent = null;
	// 默认激活状态
	public active = true;
	// 这里写了public，fn也挂载到类上了
	// scheduler可以实现组件的异步更新
	constructor(public fn, public scheduler?) {
		// 让effectScope收集该effect
		recordEffectScope(this);
	}
	// 执行effect，该effect收集响应式数据依赖，对应的响应式数据收集该effect
	run() {
		// 非激活状态，只执行函数，不进行依赖收集
		if (!this.active) {
			this.fn();
		}
		// 第一次进入时activeEffect为null
		// 如果外层有，则此时activeEffect为外层的effect
		// 即为父effect
		this.parent = activeEffect;
		// 依赖收集
		activeEffect = this;
		// 因为要重新执行fn函数，所以要清空之前的依赖
		// 避免state.flag ? state.name : state.age
		// 这种flag切换只用到后面其中一个，但是另一个没用的
		// 改变也导致更新的情况，所以要清空依赖再收集一次
		cleanupEffect(this);
		// 调用fn内的函数，触发了get，收集依赖
		let res = this.fn();
		// 恢复
		activeEffect = this.parent;
		// 避免内存泄漏
		this.parent = null;
		return res;
	}
	// 停止effect依赖收集
	stop() {
		this.active = false;
		cleanupEffect(this);
	}
}

function cleanupEffect(effect) {
	const { deps } = effect;
	// 将形参effect从  effect依赖的属性  所依赖的effect中删除
	for (let i = 0; i < deps.length; ++i) {
		deps[i].delete(effect);
	}
}

export function effect(fn, options) {
	// fn根据依赖的状态变化而重新执行，组件也是基于effect
	const _effect = new ReactiveEffect(f, options.scheduler);
	_effect.run();
	// 不bind的话run的this就是runner了
	// 就是说如果函数内用了大量this要注意
	// 赋值后this指向
	const runner = _effect.run.bind(_effect);
	runner.effect = _effect;
	return runner;
}

// 里面存放所有对象，这些对象都是有effect里面，有
// 收集了依赖的，key对象对应的val是Map，该Map的key
// 是对象的属性，val是Set，去重存放的收集的effect
const targetMap = new WeakMap();
export function track(target, type, key) {
	// 如果不在effect中，那么就不收集依赖
	if (!activeEffect) return;
	let depsMap = targetMap.get(target);
	// 如果该对象还没有收集过任何effect
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()));
	}
	let dep = depsMap.get(key);
	// 如果该对象的Map里的属性收集任何effect就设置
	if (!dep) {
		depsMap.set(key, (dep = new Set()));
	}
	trackEffects(dep);
}

export function trackEffects(dep) {
	// 如果已经收集了这个effect，就不再收集了
	// 虽然set可以去重，但是直接添加去重会耗费性能
	// 检测一遍更好
	if (activeEffect) {
		let shouldTrack = !dep.has(activeEffect);
		if (shouldTrack) {
			dep.add(activeEffect);
			// 让effect收集该dep属性，代表该effect使用了属性
			activeEffect.deps.push(dep);
		}
	}
}

// 找出该属性依赖的所有effect，全部运行
export function trigger(target, type, key, value, oldValue) {
	// 获取该对象下的所有依赖了effect的属性
	const depsMap = targetMap.get(target);
	// 没有依赖的
	if (!depsMap) return;
	// 找到key属性依赖的effect
	const effects = depsMap.get(key);

	if (effects) {
		triggerEffects(effects);
	}
}

export function triggerEffects(effects) {
	// trigger的时候拷贝一遍再run，避免死循环
	// 因为数组的forEach是底层是拷贝了该数组来遍历的，
	// 而Set的forEach是直接拿原来的Set内容来遍历，
	// 而你run的过程中可能导致该Set的内容数量改变，
	// 从而可能死循环，所以拷贝一份避免死循环
	effects = new Set(effects);
	// 1. 因为这个target[key]变化了，所以
	// 它依赖的effect重新执行，并且effect
	// 也`会再次收集依赖

	// 2. 我们要避免这个run再次调用的触发
	// 这次trigger的effect，否则会无限递归
	effects.forEach((effect) => {
		if (activeEffect !== effect) {
			// 如果用户自己传递了调度器，就执行调度器
			if (effect.scheduler) {
				effect.scheduler();
			} else {
				effect.run();
			}
		}
	});
}
