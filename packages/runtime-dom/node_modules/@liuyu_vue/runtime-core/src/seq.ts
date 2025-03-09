// 找最长子序列
function getSequence(arr) {
	const len = arr.length;
	const res = [0];
	// 存放修改被二分修改前，前一个节点的索引
	const p = res.slice(0);
	for (let i = 0; i < len; ++i) {
		const arrI = arr[i];
		if (arrI !== 0) {
			// 拿出res的最后一项和当前这项对比
			const lastIdx = res[res.length - 1];
			if (arr[lastIdx] < arrI) {
				// 存放修改被二分修改前，前一个节点的索引
				p[i] = res[res.length - 1];
				res.push(i);
				continue;
			}
			// 二分查找第一个更大的数
			const idx = find(res, arrI);
			// 上面可能返回一样大的，只有arrI更大才会去替代为res[idx]，
			// 因为arrI更有潜力
			if (arrI < arr[res[idx]]) {
				p[i] = res[idx - 1];
				res[idx] = i;
			}
		}
	}
	let l = res.length;
	let last = res[l - 1];
	while (l--) {
		res[l] = last;
		last = p[last];
	}
	return res;
	// 最后如果返回left，那么left就是第一个比target大的数
	function find(nums, target) {
		const len = nums.length;
		let left = 0;
		let right = len - 1;
		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			if (arr[nums[mid]] > target) {
				right = mid - 1;
			} else if (arr[nums[mid]] < target) {
				left = mid + 1;
			} else {
				return mid;
			}
		}
		return left;
	}
}
