import {
	proxy
} from './data.js';
import {
	regSlots,
	watchSlots,
	parseNode
} from './parser.js';
import {
  initAttribute
} from './attribute.js';
import {
	registEventHandler,
	registPublicMethods
} from './public.js';
import {
	unObserveElement
} from './observer.js'; 

  
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

			let bindedMethods = {};
			Object.keys(methods).forEach(methodName => {
				bindedMethods[methodName] = methods[methodName].bind({props, attrs, events});
			});

			regSlots(this);
			let shadow = this.attachShadow( { mode: 'closed' } );
			let tpl = document.createElement('template');
			tpl.innerHTML = desc.template.trim();
			tpl.content.childNodes.forEach(node => parseNode(node, {props, attrs, events, methods, bindedMethods}));
			shadow.appendChild(tpl.content);	

			watchSlots(this, shadow);
			this.shadow = shadow;
		
			registPublicMethods(
				this, 
				publicly, 
				{
					props, attrs, events, 
					methods: bindedMethods
				}
		);
		}

    connectedCallback() {
    }

    disconnectedCallback() {
			unObserveElement(this.shadow);
			unObserveElement(this);
    }

  }

  window.customElements.define(tagName, BaseElement);

}
