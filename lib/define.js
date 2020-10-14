import {
	proxy
} from './data.js';
import {
	parseNode
} from './parser.js';
import {
  initAttribute
} from './attribute.js';
import {
	registEventHandler,
	registPublicMethods
} from './public.js';

  
export function define(tagName, desc) {

  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
			super();
			let {
        props = {},
        attrs = {},
        events = {},
        publicly = {},
        methods = {}
      } = desc;
			
			events = registEventHandler(this, events);
			props = proxy(props, true);
      attrs = initAttribute(this, {props, attrs, events, methods});
			registPublicMethods(this, publicly, {props, attrs});

			let shadow = this.attachShadow( { mode: 'closed' } );
			let tpl = document.createElement('template');
			tpl.innerHTML = desc.template.trim();
			tpl.content.childNodes.forEach(node => parseNode(node, {props, attrs, events,methods}));
			shadow.appendChild(tpl.content);	
		}

    connectedCallback() {
    }

    disconnectedCallback() {
    }

  }

  window.customElements.define(tagName, BaseElement);

}
