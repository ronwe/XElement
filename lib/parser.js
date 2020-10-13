import {
	Dep	
} from './dep.js';
import {
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

var Parser = {
  loop: function(
		node, itemContent, xAttrs, methods, attributes, events,
		properties = {}, item, index, 
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
					Parser.loop(node, itemContent, xAttrs, methods,  attributes, events, properties, loopItem, index+ loopIndex,{appendTo: fragment})
			);
		} else {
			let tmpProperty = Object.assign({},  item,  properties, {
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
				properties: tmpProperty,  
				aliasKey: xAttrs.loopKey,
        attributes,
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
		return function(properties = {}) {
			return convertPropertyByExp(properties, expContent);			
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
	.replace(/\b([a-zA-Z]\w*(\.\w+)*\b)/g, 'properties.$1')
	.replace(/('|")\-\-(\d)+\-\-\1/g, function(all, quote, commentId) {
		return `${quote}${comments[commentId]}${quote}`;
	});
	comments.length = 0;
	return convertExp;	

}
/*
 * eval变量表达式 
 */
function convertPropertyByExp(properties, convertExp) {
	try {
		let fn = new Function('properties', `return ${convertExp}`);	
		return fn(properties);	
	} catch (err) {
		console.error(err);
		console.error(convertExp);
	}
}

export function parseAttribute(node, attr, {properties, attributes, events,  methods}) {
	let eventName = attr.name.match(/on(\w+)/);	
	if (eventName) {
		eventName = eventName[1];
		let eventHandler = methods[attr.value]
		if (eventHandler) {
			node.addEventListener(eventName, eventHandler.bind({properties, attributes, events}), false);
		}
		return true;
	} else if (/x\-(for)/.test(attr.name)) {
		switch (attr.name) {
			case 'x-for':
        let attrValue = attr.value;
        let propertiesName = attrValue;
        let aliasName = attrValue;
        let loopIndexKey;
        if (attrValue.indexOf(' in ') > 0) {
				  [aliasName, propertiesName] = propertiesName.split(' in ');
        } else if (attrValue.indexOf(' as ') > 0) {
				  [propertiesName, aliasName] = propertiesName.split(' as ');
        }
				if (aliasName) {
          let aliasParsed = aliasName.trim().match(/^\((.*)\)$/);
          if (aliasParsed) {
            aliasParsed = aliasParsed[1].split(',');
            aliasName = aliasParsed[0].trim();
            loopIndexKey = aliasParsed[1]?.trim();
          }
				}
				if (propertiesName in properties) {
					return {
						forLoop: true,
						loopItems: convertPropertyByExp(properties, `properties.${propertiesName}`) ,
            loopPath: propertiesName,
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
export function parseNode(node, {dataPath, aliasKey, properties, attributes, events, methods}) {
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
		///console.log('>>>', node, dataPath, JSON.stringify(properties));
		let parser = Parser['text'](node.nodeValue);;
		Dep.running = {
				node: node,
				type: 'text',
				dataPath,
				aliasKey,
				parser 
		}
			
		//parse text
    node.nodeValue = parser(properties);
		//收集完成
		Dep.running = null;
		///console.log('<<<');
  } else if (node.nodeType == 1) {
		for (let i = 0; i < node.attributes.length; i++) {
			let parsedAttr = parseAttribute(node, node.attributes[i], {properties, attributes, events, methods});
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
		  let parser = Parser['loop'].bind(null, node, itemContent, xAttrs, methods, attributes, events );;
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
        parser(properties, item, index );
			});
		}
	} else {
  	node.childNodes.forEach(node => parseNode(node, {aliasKey, dataPath, properties, attributes,events, methods}));
	}
}
