import {
	Dep	
} from './dep.js';

import {
  dataConnectSymbol,
	dataParentSymbol
} from './symbols.js';

import {
  proxy,
	getDataMapKey
} from  './data.js';

var Parser = {
  loop: function(
		node, itemContent, xAttrs, method, 
		property = {}, item, index, 
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
					Parser.loop(node, itemContent, xAttrs, method, property, loopItem, index+ loopIndex,{appendTo: fragment})
			);
		} else {

			let tmpProperty = Object.assign({[dataParentSymbol]: xAttrs.loopItems}, item,  property );
			let dataPath = getDataMapKey(item);
			tmpProperty[xAttrs.loopKey] = item;
			tmpProperty[xAttrs.loopIndexKey] = index;
			tmpProperty = proxy(tmpProperty);
			

			let tpl = document.createElement('template');
			tpl.innerHTML = itemContent;
			tpl.content.childNodes.forEach(node => parseNode(node, {
				property: tmpProperty,  
				aliasKey: xAttrs.loopKey,
				dataPath , 
				method
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
	text: function(text, property = {}) {
    return text.replace(/\{\{([^\}]+)\}\}/g, function(all, expression) {
			return computeExpression(expression, property);
		});
	}
}
/*
 * eval变量表达式 
 */
let comments = [];
export function computeExpression(exp, property) {	
	let convertExp = 
	exp.replace(/('|")([^\1]+)\1/, function(all, quote, comment) {
		comments.push(comment);
		let i = comments.length - 1;
		return `${quote}--${i}--${quote}`;
	})
	.replace(/\b([a-zA-Z]\w*(\.\w+)*\b)/g, 'property.$1')
	.replace(/('|")\-\-(\d)+\-\-\1/g, function(all, quote, commentId) {
		return `${quote}${comments[commentId]}${quote}`;
	});
	console.log('convertExp', convertExp);
	convertExp = convertPropertyByExp(property, convertExp);	
	comments.length = 0;
	return convertExp;	

}
export function convertPropertyByExp(property, convertExp) {
	try {
		let fn = new Function('property', `return ${convertExp}`);	
		return fn(property);	
	} catch (err) {
		console.error(err);
	}
}

export function parseAttribute(node, attr, {property, method}) {
	let eventName = attr.name.match(/on(\w+)/);	
	if (eventName) {
		eventName = eventName[1];
		let eventHandler = method[attr.value]
		if (eventHandler) {
			node.addEventListener(eventName, eventHandler.bind({property}), false);
		}
		return true;
	} else if (/x\-(for)/.test(attr.name)) {
		switch (attr.name) {
			case 'x-for':
        let attrValue = attr.value;
        let propertyName = attrValue;
        let aliasName = attrValue;
        let loopIndexKey;
        if (attrValue.indexOf(' in ') > 0) {
				  [aliasName, propertyName] = propertyName.split(' in ');
        } else if (attrValue.indexOf(' as ') > 0) {
				  [propertyName, aliasName] = propertyName.split(' as ');
        }
				if (aliasName) {
          let aliasParsed = aliasName.trim().match(/^\((.*)\)$/);
          if (aliasParsed) {
            aliasParsed = aliasParsed[1].split(',');
            aliasName = aliasParsed[0].trim();
            loopIndexKey = aliasParsed[1]?.trim();
          }
				}
				if (propertyName in property) {
					return {
						forLoop: true,
						loopItems: convertPropertyByExp(property, `property.${propertyName}`) ,
            loopPath: propertyName,
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
export function parseNode(node, {dataPath, aliasKey, property, method}) {
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
		///console.log('>>>', node, dataPath, JSON.stringify(property));
		let parser = Parser['text'].bind(null, node.nodeValue);;
		Dep.running = {
				node: node,
				type: 'text',
				dataPath,
				aliasKey,
				parser 
		}
			
		//parse text
    node.nodeValue = parser(property);
		//收集完成
		Dep.running = null;
		///console.log('<<<');
  } else if (node.nodeType == 1) {
		for (let i = 0; i < node.attributes.length; i++) {
			let parsedAttr = parseAttribute(node, node.attributes[i], {property, method});
			if (typeof parsedAttr === 'object') {
				Object.assign(xAttrs, parsedAttr);	
			}

		}
	}
	
	if (xAttrs.forLoop === true) {
		if (xAttrs.loopItems) {
			let itemContent = node.innerHTML.trim();
			node.innerHTML = '';
      console.log('xAttrs', xAttrs, dataPath, aliasKey);
		  let parser = Parser['loop'].bind(null, node, itemContent, xAttrs, method );;
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
        parser(property, item, index );
			});
		}
	} else {
  	node.childNodes.forEach(node => parseNode(node, {aliasKey, dataPath, property, method}));
	}
}
