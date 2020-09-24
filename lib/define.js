import {
	proxy
} from './data.js';
import {
	Dep	
} from './dep.js';

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
	.replace(/([a-zA-Z]\w*(\.\w+)?)/g, 'property.$1')
	.replace(/('|")\-\-(\d)+\-\-\1/g, function(all, quote, commentId) {
		return `${quote}${comments[commentId]}${quote}`;
	});
	comments.length = 0;
	try {
		let fn = new Function('property', `return ${convertExp}`);	
		convertExp = fn(property);	
	} catch (err) {
		console.error(err);
	}
	return convertExp;	

}

let Parser = {
	text: function(text, property = {}) {
    return text.replace(/\{\{([^\}]+)\}\}/, function(all, expression) {
			return computeExpression(expression, property);
		});
	}
}

function parseNode(node, {property}) {
  if (!node) {
    return;
  }
  if (
    (node.nodeType == 3  && '' == node.nodeValue.trim() ) ||
    node.nodeType == 8
  ) {
    return;
  }
	
  if (node.nodeType == 3) {
		//开始收集data节点
		let parser = Parser['text'].bind(null, node.nodeValue);;
		Dep.running = {
				node: node.parentElement,
				type: 'text',
				parser: parser
		}
			
		//parse text
    node.nodeValue = parser(property);
		//收集完成
		Dep.running = null;
  } else if (node.nodeType == 1) {
    //console.log(node, property,  node.parentElement);
	}
  node.childNodes.forEach(node => parseNode(node,{property}));
}
  
export function define(tagName, desc) {
  //let template = parser.parseFromString(desc.template, 'application/xml');

  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
			super();
			let {property} = desc;
			property = proxy(property);
			let shadow = this.attachShadow( { mode: 'closed' } );
			let tpl = document.createElement('template');
			tpl.innerHTML = desc.template.trim();
			tpl.content.childNodes.forEach(node => parseNode(node, {property}));
			shadow.appendChild(tpl.content);	
			setTimeout( () => {
				property.age = 4;
			} ,1000)
		}

    connectedCallback() {
    }

    disconnectedCallback() {
    }

  }

  window.customElements.define(tagName, BaseElement);

}
