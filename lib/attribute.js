import {
	dataRawFunctionName
} from './symbols.js';

import {
	observeElement	
} from './observer.js';

export function initAttribute(dom, options) {
  let {attrs, methods} = options;
  let attrKeys = Object.keys(attrs);
  let wouldUpdateDomAttr = true;
  let updateFn = updateAttribute.bind(null, options);
  let attrObject = {};
  let attrProxy  = new Proxy(attrObject, {
    get: function(target, key) {
			if (dataRawFunctionName === key) {
				return () => target;
			}
      if (!target[key]) {
        return;
      }
      return target[key].value;
    },
    set: function(target, key, value) {
      if (!(key in target)) {
        return false;
      }
      if (target[key].value !== value) {
        target[key].value = value;
        updateFn({dom, attrName: key,  attrValue: value, attrConf: target[key].attrConf, wouldUpdateDomAttr});
      }
      return true;
    }
  });
  if (attrKeys.length === 0 ) {
    return attrProxy;
  }
  options.attrs = attrProxy;

	function attrWatcher(elementRoot, mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type == "attributes") {
        let changedAttrName = mutation.attributeName;
        wouldUpdateDomAttr = false;
        attrProxy[changedAttrName] = elementRoot.getAttribute(changedAttrName);
        wouldUpdateDomAttr = true;
      }
    });
  }
	
	observeElement(dom, attrWatcher.bind(null, dom), {
    attributes: true 
  });


  attrKeys.forEach(attrName => {
    let attrConf = attrs[attrName];
    let domAttrValue = dom.getAttribute(attrName);
    attrObject[attrName] = {value: domAttrValue, attrConf};

    if (attrConf.default && (undefined === domAttrValue || null === domAttrValue || '' === domAttrValue)) {
      domAttrValue = attrConf.default;
    } 
    attrProxy[attrName] = domAttrValue;
  });
  return attrProxy;
}

function updateAttribute(options, {dom, attrName,  attrValue, attrConf, wouldUpdateDomAttr}) {
  if (true === wouldUpdateDomAttr) {
    dom.setAttribute(attrName, attrValue);
  }
  let {methods} = options;
  if (attrConf.onChange && methods && methods[attrConf.onChange]) {
    methods[attrConf.onChange].call(options);
  }
}
