
let elementObservers = new Map();

export function observeElement(element, watcher, options) {
  let observer = new MutationObserver(watcher);
  observer.observe(element, options);
 
  let  observers = elementObservers.get(element) || [];
  observers.push(observer);
  elementObservers.set(element, observers);
}

export function unObserveElement(element) {
  let  observers = elementObservers.get(element) || [];
  observers.forEach(observer => observer.disconnect());
  elementObservers.delete(element);
}
