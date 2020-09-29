import {
	Dep	
} from './dep.js';
import {
	dataConnectSymbol,
	dataParentSymbol,
	dataKeySymbol
} from './symbols.js';

let dataMap = new Map();
let dataIdMap = new Map();

const ChainJoinChar = '.';
let propertyRef
/*
* 生成对象id
*/
export function getDataMapKey(target,key) {
	let chains = [];
	if (undefined !== key) {
		chains.unshift(key);
	}
	let chainCheck = new Set([target]);
	while (target) {
		let pkey = target[dataKeySymbol];
		if (pkey) {
			chains.unshift(pkey);
		}
		target = target[dataParentSymbol];
		if (chainCheck.has(target)) {
			console.error('node chains exception');
			break;
		}
		chainCheck.add(target);
	}
	return chains.join(ChainJoinChar);

}

function connectData2Node(target, key) {
  if (Dep.running) {
    let dataMapKey = getDataMapKey(target,key);
		let deps =  dataMap.get(dataMapKey);	
		if (!deps) {
			deps = [];
		}
		deps.push(Dep.running);
    dataMap.set(dataMapKey, deps);
  }
}

/*
 * 更新节点
*/
function updateDateNode(target,key ) {
	let dataMapKey = getDataMapKey(target,key);			
	let deps = dataMap.get(dataMapKey);
	if (deps) {
		updateDomNodes(deps);
	}
}
/*
 * 根据路径找到data节点，如果是数组需要处理
*/
function getDataByPath(root, dataPath) {
	if (!dataPath) {
		return root;
	}
	let path = dataPath.split(ChainJoinChar);
	let data = root;
	path.forEach( chain => data = data[chain]);
	return data;
}

let domStacks = new Set();
let domUpdateTimer;
function updateDomNodes(deps ) {
		deps.forEach(domStacks.add, domStacks);
		if (domUpdateTimer) {
			window.clearTimeout(domUpdateTimer);
		}
		domUpdateTimer = window.setTimeout(function(){
			let nodeUpdated = {};
			let property = propertyRef;
			domStacks.forEach( dep => {
				let nodeTypeUpdated = nodeUpdated[dep.type];
				if (!nodeTypeUpdated) {
					nodeTypeUpdated = nodeUpdated[dep.type] = new Set();
				}
				if (nodeTypeUpdated.has(dep.node)) {
					return;
				}
				nodeTypeUpdated.add(dep.node);

				switch (dep.type) {
					case 'text':
						let loopItem = getDataByPath(property, dep.dataPath);
						let tempProperty = Object.assign({}, loopItem,  property ); 
						if (dep.aliasKey) {
							tempProperty[dep.aliasKey] = loopItem;
						}
					
						let newContent = dep.parser(tempProperty);
						dep.node.nodeValue = newContent;
						break;
				}
			});
			nodeUpdated = null;
			domStacks.clear();
		},0)
} 

/*
* 删除指定位置和数量的子节点
* 返回修正后的开始位置
*/

function removeChild(node, index, removeCount = 1) {
	let childNodes = node.childNodes;
	let childLen = childNodes.length;
	if (0 === childLen) {
		return 0;
	} 
	if (index < 0 ) {
		index = childLen + index;
	}
	if (index < 0 ) {
		index = 0;
	} else if (index >= childLen) {
		index = childLen -1;
	}
	while (removeCount--) {	
		node.removeChild(childNodes[index]);
	}
	return index;
}

function arrayProxy(target, key) {
	return function(...args) {
		let dataMapKey = getDataMapKey(target);
		let deps =  dataMap.get(dataMapKey);	
		let dep = deps? deps[0] : null;
		if (!dep) {
			return;
		}

		switch (key) {
			case 'pop':
			case 'shift':
				removeChild(dep.node, 'pop' === key ? -1 : 0);				
				break;
			case 'splice':
				let [start, len, ...toInserts] = args;
				start = removeChild(dep.node, start, len);	
				toInserts.reverse().forEach( item => {
					dep.parser(item, propertyRef, start);
				});
				break;
			case 'push':
			case 'unshift':
				let position = null;
				if ('unshift' === key) {
					position = -1;
				}
				args.forEach( item => {
					dep.parser(item, propertyRef, position);
				});
				break;
		}
	}
}

/*
 * 代理属性
 */
export function proxy(root, isRoot = false) {
	if (true === isRoot ) {
		propertyRef = root;
	}
	function setProxy(data) {
		return new Proxy(data, {
			get: function(target, key) {
				if (dataConnectSymbol === key) {
					return function() {
						connectData2Node(target);
					}
				}
				if (! target.hasOwnProperty(key) || 'symbol' === typeof key) {
					if (Array.isArray(target) && ['splice', 'shift', 'push', 'unshift', 'pop'].includes(key)) {
						return arrayProxy(target, key);
					} else {
						return target[key];
					}
				}
				if ('object' == typeof target[key]) {
					if (target !== root && !target[key][dataParentSymbol]) {
						target[key][dataParentSymbol] = target;
					}
					if (!target[key][dataKeySymbol]) {
						target[key][dataKeySymbol] = key;
					}
					return setProxy(target[key]);
				} else {
					connectData2Node(target, key );
					return target[key];
				}

			},
			set: function(target, key, value) {
				let oldValue = target[key];
				if (oldValue !== value) {
					target[key] = value;
					updateDateNode(target, key);
				}
				return true;

			},
			deleteProperty: function(target, key) {
				let dataMapKey = getDataMapKey(target,key);
				dataMap.delete(dataMapKey);

			}
		})
	}
	return setProxy(root);
}
