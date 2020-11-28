import {
	Dep	
} from './dep.js';
import {
	uuid,
	Detect
} from './utils.js';

import {
  dataConnectSymbol,
  dataKeySymbol,
	dataParentSymbol
} from './symbols.js';

import {
  proxy,
	getDataMapKey
} from  './data.js';

import {
	observeElement	
} from './observer.js';

let regedSlots = {};

var Parser = {
  loop: function(
		node, itemContent, xAttrs, methods, attrs, events,
		props = {}, item, index, 
		{
			position = null, //插入位置
			isMulti = false, //是否多段，配合autoPend使用
			appendTo  //更新到对象，可以是文档碎片
		} = {}
	) {
		let fragment;
		if (isMulti) {
			fragment = document.createDocumentFragment();
			item.forEach( (loopItem, loopIndex) => 
					Parser.loop(node, itemContent, xAttrs, methods,  attrs, events, props, loopItem, index+ loopIndex,{appendTo: fragment})
			);
		} else {
			let tmpProperty = Object.assign({},  item,  props, {
        [dataParentSymbol]: xAttrs.loopItems[index],
        [dataKeySymbol]: index 
      });
			///let dataPath = getDataMapKey(item);
      if (!isNaN(item[dataKeySymbol])) {
        item[dataKeySymbol] = index.toString();
      }
			let dataPath = getDataMapKey(item);
      if (xAttrs.loopKey) {
			  tmpProperty[xAttrs.loopKey] = item;
      }
      if (xAttrs.loopIndexKey) {
			  tmpProperty[xAttrs.loopIndexKey] = index;
      }
			tmpProperty = proxy(tmpProperty);
			

			let tpl = document.createElement('template');
			tpl.innerHTML = itemContent;
			tpl.content.childNodes.forEach(node => parseNode(node, {
				props: tmpProperty,  
				aliasKey: xAttrs.loopKey,
        attrs,
				events,
				dataPath , 
				methods
			}));
			fragment = tpl.content;
		}

		appendTo = appendTo || node;
    if (null === position) {
      appendTo.append(fragment);
    } else if (-1 === position) {
      appendTo.prepend(fragment);
    } else {
      appendTo.insertBefore(fragment, node.childNodes[position]);
    }
  },
	text: function(text) {
    let expContent = text.replace(/\{\{([^\}]+)\}\}/g, function(all, expression) {
			return "'+" + computeExpression(expression) + "+'";
		});
		expContent = `'${expContent}'`;
		return function(props = {}) {
			return convertPropertyByExp(props, expContent);			
		}
	}
}
/*
 * 变量添加作用域前缀 
 */
let comments = [];
function computeExpression(exp ) {	
	let convertExp = 
	exp.replace(/('|")([^\1]+)\1/, function(all, quote, comment) {
		comments.push(comment);
		let i = comments.length - 1;
		return `${quote}--${i}--${quote}`;
	})
	.replace(/\b([a-zA-Z]\w*(\.\w+)*\b)/g, 'props.$1')
	.replace(/('|")\-\-(\d)+\-\-\1/g, function(all, quote, commentId) {
		return `${quote}${comments[commentId]}${quote}`;
	});
	comments.length = 0;
	return convertExp;	

}
/*
 * eval变量表达式 
 */
function convertPropertyByExp(props, convertExp) {
	try {
		convertExp = convertExp.replace(/\n/g, '\\n');
		let fn = new Function('props', `return ${convertExp}`);	
		return fn(props);	
	} catch (err) {
		console.error(err);
		console.error(convertExp);
	}
}

export function parseAttribute(node, attr, {props, attrs, events,  methods, bindedMethods}) {
	let eventName = attr.name.match(/on(\w+)/);	
	if (eventName) {
		eventName = eventName[1];
		let eventHandler = bindedMethods[attr.value]
		if (eventHandler) {
			node.addEventListener(eventName, eventHandler, false);
		}
		return true;
	} else if (/x\-(for)/.test(attr.name)) {
		switch (attr.name) {
			case 'x-for':
        let attrValue = attr.value;
        let propsName = attrValue;
        let aliasName = attrValue;
        let loopIndexKey;
        if (attrValue.indexOf(' in ') > 0) {
				  [aliasName, propsName] = propsName.split(' in ');
        } else if (attrValue.indexOf(' as ') > 0) {
				  [propsName, aliasName] = propsName.split(' as ');
        }
				if (aliasName) {
          let aliasParsed = aliasName.trim().match(/^\((.*)\)$/);
          if (aliasParsed) {
            aliasParsed = aliasParsed[1].split(',');
            aliasName = aliasParsed[0].trim();
            loopIndexKey = aliasParsed[1]?.trim();
          }
				}
				if (propsName in props) {
					return {
						forLoop: true,
						loopItems: convertPropertyByExp(props, `props.${propsName}`) ,
            loopPath: propsName,
						loopKey: aliasName,
            loopIndexKey
					}
				} else {
					return false
				}
				break;
		}
	}
}

function replaceSlot(node) {
	let slotName = node.getAttribute('name') || 'default';
	let regedSlot = regedSlots[slotName];
	if (regedSlot) {
		let clonedSlot = regedSlot.cloneNode(true); 
		let slotNewName = slotName + '-' + uuid(); 
		clonedSlot.setAttribute('slot', slotNewName);
		regedSlots[slotName].insertAdjacentElement('afterend', clonedSlot);
		node.setAttribute('name', slotNewName);
		//node.replaceWith(regedSlots[slotName].cloneNode(true));
	}
}

function removeSlotByNodeWatcher(elementRoot, mutations) {
	mutations.forEach(function(mutation) {
		mutation.removedNodes.forEach(node => {
			let slots = node.querySelectorAll('slot');
			slots.forEach(slot => {
				let slotName = slot.getAttribute('name');
				let clonedSlot = elementRoot.querySelector(`[slot="${slotName}"]`);
				elementRoot.removeChild(clonedSlot);
			});
		})
	});
}

export function watchSlots(elementRoot, shadowRoot) {
	observeElement(shadowRoot, removeSlotByNodeWatcher.bind(null, elementRoot), {
		childList: true,
		subtree: true
  });

}
/*
 * 将用户定义的slot注册到内部对象，以待复制使用
*/
export function regSlots(elementRoot) {
	regedSlots = {};
	Array.from(elementRoot.childNodes).forEach(node => {
		if (node.nodeType !== 1) {
			return;
		}
		let slotName = node.getAttribute('slot') || 'default';
		regedSlots[slotName] = node;
	});
}

export function parseNode(node, {dataPath, aliasKey, props, attrs, events, methods, bindedMethods}) {
  if (!node) {
    return;
  }
  if (
    (node.nodeType == 3  && '' == node.nodeValue.trim() ) ||
    node.nodeType == 8
  ) {
    return;
  }
	
	let xAttrs = {};
  if (node.nodeType == 3) {
		//开始收集data节点
		///console.log('>>>', node, dataPath, JSON.stringify(props));
		let parser = Parser['text'](node.nodeValue);;
		Dep.running = {
				node: node,
				type: 'text',
				dataPath,
				aliasKey,
				parser 
		}
			
		//parse text
    node.nodeValue = parser(props);
		//收集完成
		Dep.running = null;
		///console.log('<<<');
  } else if (node.nodeType == 1) {
		if ('SLOT' === node.tagName) {
			//具名slot循环后只有第一个生效， 这里用复制的元素代替
			replaceSlot(node);	
		}
		for (let i = 0; i < node.attributes.length; i++) {
			let parsedAttr = parseAttribute(node, node.attributes[i], {props, attrs, events, methods, bindedMethods});
			if (Detect.isObject(parsedAttr)) {
				Object.assign(xAttrs, parsedAttr);	
			}
		}
	}
	
	if (xAttrs.forLoop === true) {
		if (xAttrs.loopItems) {
			let itemContent = node.innerHTML.trim();
			node.innerHTML = '';
      //console.log('xAttrs', xAttrs, dataPath, aliasKey);
		  let parser = Parser['loop'].bind(null, node, itemContent, xAttrs, methods, attrs, events );;
      Dep.running = {
        node,
        type: 'loop',
        dataPath: xAttrs.loopPath,
        aliasKey: xAttrs.loopKey,
        loopIndexKey: xAttrs.loopIndexKey,
        parser
      }
      xAttrs.loopItems[dataConnectSymbol]();
      Dep.running = null;
			xAttrs.loopItems.forEach( (item, index)  => {
        parser(props, item, index );
			});
		}
	} else {
  	node.childNodes.forEach(node => parseNode(node, {aliasKey, dataPath, props, attrs,events, methods, bindedMethods}));
	}
}
