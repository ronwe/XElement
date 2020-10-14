export function initAttribute(dom, options) {
  let {attrs, methods} = options;
  let attrKeys = Object.keys(attrs);
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
  options.attrs = attrProxy;

  let observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type == "attrs") {
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
