import {
	Dep	
} from './dep.js';

import {
	dataRawFunctionName,
	dataConnectSymbol,
	dataParentSymbol,
	dataKeySymbol
} from './symbols.js';

import {
	Detect
} from './utils.js';

let dataMap = new Map();
let dataIdMap = new Map();

const ChainJoinChar = '.';
let propertyRef
let domUpdateTimer;
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
			chains.unshift(pkey.toString());
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
/*
 * 获取对象所有叶子节点对应key 
 */
function updatedSubNodes(node, value) {
  mapNode(value, node);
}

function mapNode(value, root) {
  Object.keys(value).forEach(k => {
    if (Detect.isObject(value[k])) {
      mapNode(value[k], root[k]);
    } else {
			updateDataNode(root, k);
    }
  })
}
/*
 * 更新节点*/

function updateNode(target, key, value) {
  let node = target[key];
  let nodeParent = node[dataParentSymbol];
  let nodeKey = node[dataKeySymbol];
  target[key] = value;
  if (nodeParent) {
    node[dataParentSymbol] = nodeParent;
  }
  if (nodeKey) {
    node[dataKeySymbol] = nodeKey;
  }
  return node;
}
/*
 * 删除对应节点*/
function disConnectDataNode(target, key) {
  let dataMapKey = getDataMapKey(target,key);
  let deps =  dataMap.get(dataMapKey) || [];	
  updateDomNodes(deps);
  dataMap.delete(dataMapKey);
} 
/*
 * 关联dom节点和数据节点*/

function connectData2Node(target, key) {
  if (Dep.running) {
    let dataMapKey = getDataMapKey(target,key);
    ///console.log('dataMapKey', dataMapKey, Dep.running);
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
function updateDataNode(target,key ) {
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
let updatedKeysStack = [];
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

				let rootItem = getDataByPath(property, dep.dataPath);
				switch (dep.type) {
          case 'data':
            dep.compute();
            break;
					case 'text':
						let tempProperty = Object.assign({}, rootItem,  property ); 
						if (dep.aliasKey) {
							tempProperty[dep.aliasKey] = rootItem;
						}
					
						let newContent = dep.parser(tempProperty);
						dep.node.nodeValue = newContent;
						break;
					case 'loop':
						dep.node.innerHTML = '';
						rootItem.forEach( (item, index) => {
							dep.parser(index, item, property);
						});
						break;
          case 'parse':
            dep.parse();
            break;
				}
			});
			nodeUpdated = null;
			domStacks.clear();
      updatedKeysStack.length = 0;
		},0)
} 

function removeNode(node) {
  node.parentNode.removeChild(node);
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
	if (index + removeCount > childLen) {
		removeCount = childLen - index;
	}
	while (removeCount--) {	
		node.removeChild(childNodes[index]);
	}
	return index;
}

function emptyChild(node) {
	node.innerHTML = '';
}

function arrayProxy(target, key) {
	return function(...args) {
		let oldLen = target.length;
		target[key].call(target,...args);
		let dataMapKey = getDataMapKey(target);
		let deps =  dataMap.get(dataMapKey);	
		if (!deps.length) {
			return;
		}
    //有对数组内元素赋值, 下标变动可能会影响
    let itemInTargetChanged = ('|' + updatedKeysStack.join('|') + '|').indexOf('|' + dataMapKey) >= 0;
    if (true === itemInTargetChanged) {
      key = 'flush';
    }
    ///TODO 关联多个节点需要循环
		let index = 0;

		switch (key) {
			case 'pop':
			case 'shift':
				deps.forEach( dep => {
					removeChild(dep.node, 'pop' === key ? -1 : 0);				
				});
				break;
			case 'splice':
				let [start, len, ...toInserts] = args;
				deps.forEach( dep => {
					if (dep.loopIndexKey) {
						//TODO 插入位置之后全部更新
						removeChild(dep.node, start, oldLen - start);	
						toInserts = target.slice(start);
						dep.parser(propertyRef, toInserts, start, {position: start, isMulti: toInserts.length});
					} else {
						start = removeChild(dep.node, start, len);	
						dep.parser(propertyRef, toInserts, start, {position: start, isMulti: toInserts.length});
					}
				});
				break;
			case 'push':
			case 'unshift':
      case 'flush':
				let position = null;
        let isMulti = args.length;
        if (itemInTargetChanged) {
          index = 0;
          isMulti = true;
        } else if ('unshift' === key) {
					index = 0;
					position = -1;
				} else {
					index = oldLen;
					position = oldLen;
				}
				deps.forEach( dep => {
					if (dep.loopIndexKey || itemInTargetChanged) {
						if ((0 === index && oldLen) || itemInTargetChanged) {
							emptyChild(dep.node);
						}
						dep.parser(propertyRef, target, index, {isMulti});
					} else {
						dep.parser(propertyRef, args, index, {position, isMulti});
					}
				});
				break;
		}
	}
}

/*
 * 挂载computed属性
 * */
export function extendProps(params = {}, computed = {}) {
  let {props} = params;
  Object.keys(computed).forEach( extendPropName => {
    Dep.running = {
      type: 'data',
      node: extendPropName,
      compute: () => {
        props[extendPropName] = computed[extendPropName](params);
      }
    };
    let computedValue = computed[extendPropName](params);
    Dep.running = null;
    props[extendPropName] = computedValue;
  });

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
				} else if (dataRawFunctionName === key) {
					return () => JSON.parse(JSON.stringify(target));
				}
				if (! target.hasOwnProperty(key) || 'symbol' === typeof key) {
					if (Detect.isArray(target) && ['splice', 'shift', 'push', 'unshift', 'pop'].includes(key)) {
						return arrayProxy(target, key);
					} else {
						return target[key];
					}
				}
				if (Detect.isObject(target[key])) {
					//if (target !== root && !target[key][dataParentSymbol]) {
					if (target !== propertyRef && !target[key][dataParentSymbol]) {
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
        //console.log('set', target, key);
				if (oldValue !== value) {
          let updatedKeys = getDataMapKey(target, key);
          updatedKeysStack.push(updatedKeys);
          if (Detect.isObject(value, true)) {
            let node = proxy(updateNode(target, key, value));
            //非叶子节点更新，需手工遍历被更新的key
            updatedSubNodes(node, value);
          } else {
					  target[key] = value;
					  updateDataNode(target, key);
          }

				}
				return true;

			},
			deleteProperty: function(target, key) {
        delete target[key];
        disConnectDataNode(target, key);
        return true;
			}
		})
	}
	return setProxy(root);
}
