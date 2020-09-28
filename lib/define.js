import {
	proxy
} from './data.js';
import {
	parseNode
} from './parser.js';

  
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
