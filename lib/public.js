/*
* 注册公共方法*/
export function registPublicMethods(element, publicMethods, options) {
  Object.keys(publicMethods).forEach( methodName => {
    element[methodName] = publicMethods[methodName].bind(options);;
  });
}

/*
* 抛出事件*/
export function dispatchEvents(element, type, options) {
  let opts = Object.assign({bubbles: false, cancelable: false}, options);
  let evt = new CustomEvent(type, opts);
  element.dispatchEvent(evt);
}

/*
*注册事件句柄*/
export function registEventHandler(element,  events = []) {
	let eventsObj = {};
  function emit (type, detail, opts) {
    let newOpts = Object.assign({detail}, opts);
    dispatchEvents(element, type, newOpts);
  }
  //触发自定义事件
  events.forEach( type => {
    eventsObj[type] = {
			emit: (detail, opts) => emit(type, detail, opts) 
		}
  });

  //监听事件
  eventsObj.on = function(type, cbk) {
    element.addEventListener(type, cbk, false);
  }
  eventsObj.remove  = function(type, cbk) {
    element.removeEventListener(type, cbk, false);
  }
	return eventsObj;
}
