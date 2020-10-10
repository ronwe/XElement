export function initAttribute(dom, options) {
  let {property, attribute, method} = options;
  let updateFn = updateAttribute.bind(null, options);
  let attrObject = {};
  let attrProxy  = new Proxy(attrObject, {
    set: function(target, key, value) {
      if (!target[key]) {
        return false;
      }
      if (target[key].value !== value) {
        target[key].value = value;
        updateFn({dom, key,  value, attrConf: target[key].attrConf});
      }
      return true;
    }
  });

  Object.keys(attribute).forEach(attrName => {
    let attrConf = attribute[attrName];
    let domAttrValue = dom.getAttribute(attrName);
    attrObject[attrName] = {value: domAttrValue, attrConf};

    if (attrConf.default && (undefined === domAttrValue || null === domAttrValue || '' === domAttrValue)) {
      domAttrValue = attrConf.default;
    } 
    attrProxy[attrName] = domAttrValue;
  });
  return attrProxy;
}

function updateAttribute(options, {dom, attrName,  domAttrValue, attrConf}) {
  dom.setAttribute(attrName, domAttrValue);
  let {method} = options;
  if (attrConf.onChange && method && method[attrConf.onChange]) {
    method[attrConf.onChange].call(options);
  }
}
