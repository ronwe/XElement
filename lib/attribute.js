export function initAttribute(dom, options) {
  let {attribute, method} = options;
  let attrKeys = Object.keys(attribute);
  let wouldUpdateDomAttr = true;
  let updateFn = updateAttribute.bind(null, options);
  let attrObject = {};
  let attrProxy  = new Proxy(attrObject, {
    get: function(target, key) {
      if (!target[key]) {
        return;
      }
      return target[key].value;
    },
    set: function(target, key, value) {
      if (!target[key]) {
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
  options.attribute = attrProxy;

  let observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type == "attributes") {
        let changedAttrName = mutation.attributeName;
        wouldUpdateDomAttr = false;
        attrProxy[changedAttrName] = dom.getAttribute(changedAttrName);
        wouldUpdateDomAttr = true;
      }
    });
  });

  observer.observe(dom, {
    attributes: true 
  });


  attrKeys.forEach(attrName => {
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

function updateAttribute(options, {dom, attrName,  attrValue, attrConf, wouldUpdateDomAttr}) {
  if (true === wouldUpdateDomAttr) {
    dom.setAttribute(attrName, attrValue);
  }
  let {method} = options;
  if (attrConf.onChange && method && method[attrConf.onChange]) {
    method[attrConf.onChange].call(options);
  }
}
