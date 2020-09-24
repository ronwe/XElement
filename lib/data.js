import {
	Dep	
} from './dep.js';
import {
	uuid
} from './utils.js';

let dataMap = new Map();
let dataIdMap = new Map();
/*
* 生成对象id
*/
function getDataMapKey(target,key) {
  let id = dataIdMap.get(target);
  if (!id) {
    id = uuid();
    dataIdMap.set(target, id);
  }
  return id + key || '';
}

function connectData2Node(target, key) {
  if (Dep.running) {
    let dataMapKey = getDataMapKey(target,key);
		let deps =  dataMap.get(dataMapKey);	
		if (!deps) {
			deps = [];
    	dataMap.set(dataMapKey, deps);
		}
		deps.push(Dep.running);
  }
}

/*
 * 更新节点
*/
function updateDateNode(target,key, data) {
	let dataMapKey = getDataMapKey(target,key);			
	let deps = dataMap.get(dataMapKey);
	updateDomNodes(deps, data);
}

let domStacks = [];
let domUpdateTimer;
function updateDomNodes(deps, property) {
		domStacks = domStacks.concat(deps);
		if (domUpdateTimer) {
			window.clearTimeout(domUpdateTimer);
		}
		domUpdateTimer = window.setTimeout(function(){
			let nodeUpdated = {};
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
						let newContent = dep.parser(property);
						dep.node.innerHTML = newContent;
						break;
				}
			});
			nodeUpdated = null;
			domStacks.length = 0;
		},0)
} 

export function proxy(data) {
	
  return new Proxy(data, {
    get: function(target, key) {
      //收集关联节点
      if (Array.isArray(target) ) {
        connectData2Node(target);
        if (target.hasOwnProperty(key)) {
          return target[key];
        } else {
          console.log(target, key);
        }
      } else {
        connectData2Node(target,key);
        return target[key];
      }
    },
    set: function(target, key, value) {
			let oldValue = target[key];
			if (oldValue !== value) {
				let dataMapKey = getDataMapKey(target,key);
				target[key] = value;
				updateDateNode(target, key, data);
			}
      return true;

    },
    deleteProperty: function(target, key) {
       dataMap.delete([target,key]);

    }
  })
}
