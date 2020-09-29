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

function arrayProxy(target, key) {
	return function(...args) {
		switch (key) {
			case 'push':
			case 'unshift':
				let dataMapKey = getDataMapKey(target);
				let deps =  dataMap.get(dataMapKey);	
				let dep = deps? deps[0] : null;
				if (!dep) {
					return;
				}
				args.forEach( item => {
					dep.parser(item, propertyRef);
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
					if (Array.isArray(target) && ['shift', 'push', 'unshift', 'pop'].includes(key)) {
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
