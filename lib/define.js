import {
	proxy,
	getDataMapKey
} from './data.js';
import {
	Dep	
} from './dep.js';
import {
	dataParentSymbol
} from './symbols.js';

let parser = new DOMParser();

let comments = [];
/*
 * eval变量表达式 
 */
function computeExpression(exp, property) {	
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
function convertPropertyByExp(property, convertExp) {
	try {
		let fn = new Function('property', `return ${convertExp}`);	
		return fn(property);	
	} catch (err) {
		console.error(err);
	}

}

let Parser = {
	text: function(text, property = {}) {
    return text.replace(/\{\{([^\}]+)\}\}/, function(all, expression) {
			return computeExpression(expression, property);
		});
	}
}


function parseAttribute(node, attr, {property, method}) {
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
				let [aliasName, propertyName] = attr.value.split(' in ');
				if (undefined === propertyName) {
					propertyName = aliasName;
				}
				if (propertyName in property) {
					return {
						forLoop: true,
						loopItems: convertPropertyByExp(property, `property.${propertyName}`) ,
						loopKey: aliasName
					}
				} else {
					return false
				}
				break;
		}
	}
}

function parseNode(node, {dataPath, property, method}) {
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
		console.log('>>>', node, dataPath, JSON.stringify(property));
		let parser = Parser['text'].bind(null, node.nodeValue);;
		Dep.running = {
				node: node.parentElement,
				type: 'text',
				dataPath,
				parser 
		}
			
		//parse text
    node.nodeValue = parser(property);
		//收集完成
		Dep.running = null;
		console.log('<<<');
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
			xAttrs.loopItems.forEach( item => {
				let tmpProperty = Object.assign({[dataParentSymbol]: xAttrs.loopItems}, item,  property );
				let dataPath = getDataMapKey(item);
				tmpProperty[xAttrs.loopKey] = item;
				tmpProperty = proxy(tmpProperty);
				
				let tpl = document.createElement('template');
				tpl.innerHTML = itemContent;
				tpl.content.childNodes.forEach(node => parseNode(node, {
					property: tmpProperty,  
					dataPath , 
					method
				}));
				node.appendChild(tpl.content);
			});
		}
	} else {
  	node.childNodes.forEach(node => parseNode(node,{dataPath, property}));
	}
}
  
export function define(tagName, desc) {

  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
			super();
			let {property = {}, method = {}} = desc;
			property = proxy(property, true);
			let shadow = this.attachShadow( { mode: 'closed' } );
			let tpl = document.createElement('template');
			tpl.innerHTML = desc.template.trim();
			tpl.content.childNodes.forEach(node => parseNode(node, {property, method}));
			shadow.appendChild(tpl.content);	
		}

    connectedCallback() {
    }

    disconnectedCallback() {
    }

  }

  window.customElements.define(tagName, BaseElement);

}
