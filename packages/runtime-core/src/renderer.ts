import { ShapeFlags } from "@my_vue/shared/src";
import { isString } from "lodash";
import { createVnode, isSameVnode } from "./vnode";
import { patchProps } from "@my_vue/runtime-dom/src/patchProps";
import { reactive } from "vue";
import { ReactiveEffect } from "@my_vue/reactivity/src/effect";
import { hasOwnProperty } from ".";
import {
	createComponentInstance,
	setupComponent,
	setupRenderEffect,
} from "./componenet";
import { isKeepAlive } from "./components/KeepAlive";
export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");

export function createRender(renderOptions) {
	// 重新命名避免误认为是DOM操作自己的API
	// 取出用户传递的操作DOM的API
	let {
		insert: hostInsert,
		remove: hostRemove,
		setElementText: hostSetElement,
		setText: hostSetText,
		querySelector: hostQuerySelector,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling,
		createElement: hostCreateElement,
		createText: hostCreateText,
		patchProps: hostPatchProp,
	} = renderOptions;

	function mountChildren(children, container) {
		for (let i = 0; i < children.length; i++) {
			// 如果是字符串则转化为vnode形式
			let child = normalize(children[i]);
			patch(null, chilren[i], container);
		}
	}

	function normalize(child) {
		// 如果是字符串，则转化为vnode形式
		if (isString(child)) {
			return createVnode(Text, null, child);
		}
		return child;
	}

	function mountElement(vnode, container) {
		let { type, props, children, shapeFlag } = vnode;
		// 1.创建父元素
		vnode.el = hostCreateElement(type);
		// 2. 循环挂载属性，事件
		if (props) {
			for (let key in props) {
				// 因为是创建，所以以前的propKey为null
				hostPatchProp(el, key, null, props[key]);
			}
		}
		// 3. 处理子节点
		// 是文本节点
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			hostSetText(children);
			// 是数组
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			mountChildren(children, el);
		}
		// 4. 将创建的父元素挂载到container容器里
		hostInsert(el, container);
	}

	function processText(n1, n2, container) {
		// n1没有代表要初始化文本
		if (n1 == null) {
			// 创建文本节点
			n2.el = hostCreateText(n2.children);
			// 插入文本节点
			hostInsert(n2.el, container);
			// n1, n2都是文本
		} else {
			// 复用节点
			n2.el = n1.el;
			// 文本内容不同，设置为最新的n2的文本
			if (n1.children !== n2.children) {
				hostSetText(el, n2.children);
			}
		}
	}

	// 将所有属性取出来对比
	function patchProps(oldProps, newProps, el) {
		for (let key in newProps) {
			hostPatchProp(el, key, oldProps[key], newProps[key]);
		}
		for (let key in oldProps) {
			// 新节点没有但老节点有的，从新节点中删除
			if (newProps[key] == null) {
				hostPatchProp(el, key, oldProps[key], null);
			}
		}
	}
	function patchKeyedChildren(c1, c2, el) {
		// 当前便利到的元素索引
		let i = 0;
		// 第一个数组的尾部
		let e1 = c1.length - 1;
		// 第二个数组的尾部
		let e2 = c2.length - 1;
		// 一方循环完毕就终止比较。先只移动头部指针
		while (i <= e1 && i <= e2) {
			const n1 = c1[i];
			const n2 = c2[i];
			if (isSameVnode(n1, n2)) {
				// 当前节点是同个节点，继续递归比对
				patch(n1, n2, el);
				// 当找到第一个不相同的时候，就break
			} else {
				break;
			}
			++i;
		}
		// 先只比较尾部指针
		while (i <= e1 && i <= e2) {
			const n1 = c1[e1];
			const n2 = c2[e2];
			if (isSameVnode(n1, n2)) {
				patch(n1, n2, el);
			} else {
				break;
			}
			--e1;
			--e2;
		}
		// 这里进行逻辑操作
		// 如果最后i > e1 && i <= e2，那代表 “新”的数组内元素个数 > “老”数组内的元素个数
		// ................
		// 1. 普通处理
		// 新的多
		if (i > e1 && i <= e2) {
			// 需要插入。比如旧a b，新a b c
			// 如果i的下一个没有，代表需要向后插入。
			let nextPos = e2 + 1;
			let anchor = c2[nextPos]?.el;
			// 依次插入“新”新增的元素。比如旧a b，新a b c，这里就加了c
			while (i <= e2) {
				patch(null, c2[i++], el, anchor);
			}
			// 旧的多，需要从旧的中删除多余的。比如旧a b c，新a b
		} else if (i > e2 && i <= e1) {
			while (i <= e1) {
				unmount(c1[i++]);
			}
		}
		// 2.特殊处理，主要是复用节点。比如旧a b c d e g f，新a b e c d h f g
		let s1 = i;
		let s2 = i;
		// 尽量复用节点，用新的节点存进map中，有则复用，无则新增
		const keyToNewIndexMap = new Map();
		// 头，尾指针包含的中间部分。代表需要被patch的节点数目。这里用的是新节点。
		let toBePatched = e2 - s2 + 1;
		// 新vnode内的元素在旧节点中的索引位置，根据这个数组求出最长递增子序列
		let newIndexToOldMapIndex = new Array(toBePatched).fill(0);
		for (let i = s2; i <= e2; ++i) {
			const vnode = c2[i];
			// key为元素本身的:key="xxx"，通过key判断能否复用
			keyToNewIndexMap.set(vnode.key, i);
		}
		for (let i = s1; i <= e1; ++i) {
			const vnode = c1[i];
			// 通过key找能否复用
			const newIndex = keyToNewIndexMap.get(vnode.key);
			// 如果新的里面找不到，就删除该老节点
			if (newIndex === undefined) {
				unmount(vnode);
			} else {
				newIndexToOldMapIndex[newIndex - s2] = i + 1;
				// 可以复用，将当前旧节点内容都变为复用节点的内容
				patch(vnode, c2[newIndex], el);
			}
		}
		// 3. 在2中将旧节点内的元素都变为最新的节点了，但是顺序可能有误，要排序
		// 3.1 可以按照新节点的顺序依次插入（倒序遍历插入，因为inserAPI是insetBefore）
		// 3.2 插入过程中，可能“新”节点的元素更多，还需要先创建
		// .......
		// 要倒序插入的个数
		// 找出索引连续性最强的节点复用，减少插入次数
		// 最长递增子序列，索引和这里面相同的，就不需要比较了，直接复用
		let increasingSeq = getSequence(newIndexToOldMapIndex);
		let j = increasingSeq.length - 1;
		// 找到开始插入的索引
		for (let i = toBePatched - 1; i >= 0; i--) {
			// 找下一个元素作为参照物插入
			let newIndex = s2 + i;
			let anchor = c2[newIndex + 1]?.el;
			// c2中没有这个元素，那么就应该新增该元素
			if (!c2[newIndex].el) {
				patch(null, c2[newIndex], el, anchor);
			} else {
				// 最长递增子序列部分，直接复用，不用插入
				if (i === increasingSeq[j]) {
					j--;
				} else {
					// 默认是insertBefore
					hostInsert(vnode.el, el, anchor);
				}
			}
		}
	}
	// 比较两个虚拟节点儿子的差异，el为父节点
	function patchChildren(n1, n2, el) {
		const c1 = n1 && n1.children;
		const c2 = n2 && n2.children;
		// 儿子可能是文本   数组  null
		const prevShapeFlag = n1.shapeFlag;
		const shapeFlag = n2.shapeFlag;
		//1.新的是文本，老的是数组，移除老的；
		//2.新的是文本，老的也是文本，内容替换
		//3.老的是数组，新的是数组，全量diff 算法
		//4.老的是数组，新的不是数组，移除老的子节点
		//5.老的是文本，新的是空，卸载
		//6.老的是文本，新的是数组
		/**
		 * 下面是实现
		 */
		// 1.新的是文本，老的是数组，移除老的；
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// 卸载c1
				unmountChildren(c1);
			}
			//2.新的是文本，老的也是文本，内容替换
			if (c1 !== c2) {
				hostSetElementText(el, c2);
			}
		} else {
			//3.老的是数组，新的是数组，全量diff 算法
			if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					// 全量diff
					patchKeyedChildren(c1, c2, el);
				} else {
					//4.老的是数组，新的不是数组，移除老的子节点
					unmountChildren(c1);
				}
			} else {
				//5.老的是文本，新的是空，卸载
				if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
					hostSetElementText(el, "");
				}
				//6.老的是文本，新的是数组
				if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
					mountChildren(c2, el);
				}
			}
		}
	}
	function unmountChildren(children) {
		for (let i = 0; i < children.length; ++i) {
			let child = children[i];
			unmount(child);
		}
	}
	function patchBlockChildren(n1, n2) {
		for (let i = 0; i < n2.dynamicChildren; ++i) {
			patchElement(n1.dynamicChildren[i], n2.dynamicChildren[i]);
		}
	}

	// 先复用节点，再比较属性，再比较儿子
	function patchElement(n1, n2) {
		// 1. 复用节点
		let el = (n2.el = n1.el);
		// 2.比较属性
		let oldProps = n1.props || {};
		let newProps = n2.props || {};
		// 对比更改el的属性
		let { patchFlag } = n2;
		if (patchFlag & PatchFlags.CLASS) {
			if (oldProps.class !== newProps.class) {
				hostPatchProp(el, "class", null, newProps.class);
			}
		} else {
			patchProps(oldProps, newProps, el);
		}
		// 3. 比较孩子
		// 直接比较动态节点
		if (n2.dynamicChildren) {
			patchBlockChildren(n1, n2);
		} else {
			// 全量对比
			patchChildren(n1, n2, el);
		}
	}

	function processElement(n1, n2, container, anchor) {
		// n1老节点不存在，说明是初次挂载
		if (n1 == null) {
			mountElement(n2, container, anchor);
		} else {
			// 更新逻辑
			patchElement(n1, n2, anchor);
		}
	}
	function processFragment(n1, n2, container, parentComponent) {
		if (n1 == null) {
			mountElement(n2, container);
		} else {
			// why? diff对比
			patchElement(n1, n2);
		}
	}

	function shouldUpdateComponent(n1, n2) {
		const { props: prevProps, children: prevChildren } = n1;
		const { props: nextProps, children: nextChildren } = n2;
		if (prevProps === nextProps) return false;
		// 其一有插槽就直接更新
		if (prevChildren || nextChildren) return true;
		return hasPropsChanged(prevProps, nextProps);
	}

	// instance.props是响应式的，因为被shallowReactive()了，或者
	// 传递的本身就是ref或者reactive响应式的，并且因为后面new ReactiveEffect了，
	// 且传递的getter是render函数，会再次调用组件内的响应式数据和props，会收集
	// 依赖，数据变了从而触发调度器让组件额外处理后，再次render更新
	function updateComponent(n1, n2) {
		// 复用节点
		const instance = (n2.component = n1.component);
		if (shouldUpdateComponent(n1, n2)) {
			// next表示"将要更新为的vnode"，用于拿到最新数据
			instance.next = n2;
			// 拿到最新数据后update
			instance.update();
		}
	}

	/**
	 * 1. 创建组件实例
	 * 2. 给组件实例赋属性和事件
	 * 3. 创建effect
	 */
	function mountComponent(vnode, container, anchor) {
		// 1
		let instance = (vnode.component = createComponentInstance(vnode));
		// 判断该组件是否被kepp-alive
		if (isKeepAlive(vnode)) {
			instance.ctx.renderer = {
				createElement: hostCreateElement,
				move(vnode, container) {
					// 将另一个缓存组件的切换进来
					hostInsert(vnode.component.subTree.el, container);
				},
			};
		}
		// 2
		setupComponent(instance);
		// 3
		setupRenderEffect(instance, container, anchor);
	}

	function processComponent(n1, n2, container, anchor) {
		if (n1 == null) {
			if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
				parentComponent.ctx.activate(n2, container);
			}
			// 初次挂载
			mountComponent(n2, container, anchor);
		} else {
			// 组件更新props
			updateComponent(n1, n2);
		}
	}

	// n1为老节点，n2为新节点。n2可能是文本字符串
	// 将n1和n2  diff比对，然后将修改后的vnode挂载到container上
	function patch(n1, n2, container, anchor = null, parentComponent = null) {
		if (n1 === n2) return;
		// 如果n1和n2不是一个东西，直接替换
		if (n1 && !isSameVnode(n1, n2)) {
			unmount(n1, parentComponent);
			// n1设置为null就会走下面的初次挂载逻辑
			n1 = null;
		}
		const { type, shapeFlag } = n2;
		// 走到这里说明n1为null或者n1和n2为相同类型
		switch (type) {
			// 处理文本类型
			case Text:
				processText(n1, n2, container);
				break;
			case Fragment: // <></>标签
				processFragment(n1, n2, container, parentComponent);
				break;
			default:
				// 是其他元素
				if (shapeFlag & ShapeFlags.ELEMENT) {
					processElement(n1, n2, container, anchor, parentComponent);
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					processComponent(
						n1,
						n2,
						container,
						anchor,
						parentComponent
					);
				} else if (shapeFlag & ShapeFlags.TELEPORT) {
					type.process(n1, n2, container, anchor, {
						mountChildren,
						patchChildren,
						move(vnode, container, anchor) {
							// 组件对应的DOM在vnode.component.subTree.el上，不然在vnode.el上
							hostInsert(
								vnode.componenet
									? vnode.component.subTree.el
									: vnode.el
							);
						},
					});
				}
		}
	}
	// 卸载的可能是组件，文本等等
	function unmount(vnode, parentComponent) {
		if (vnode.type === Fragment) {
			return unmountChildren(vnode);
		} else if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
			parentComponent.ctx.deactivate(vnode);
		} else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
			return unmountChildren(vnode.component.subTree, null);
		}
		hostRemove(vnode.el);
	}

	// vnode为传递的最新的虚拟vnode
	function render(vnode, container) {
		// 调用render(null,container)就是把container内部的html清空
		if (vnode == null) {
			// 卸载逻辑
			// container容器本来就存在vnode，就卸载
			if (container._vnode) {
				unmount(container._vnode);
			}
		} else {
			// 既可以初始化，又可以更新
			// 如果同一个容器第二次被render，才会改变._vnode
			patch(container._vnode || null, vnode, container);
		}
		// ._vnode每次都保存上一次的状态，便于比较
		container._vnode = vnode;
	}
	return {
		render,
	};
}
