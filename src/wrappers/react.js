
export default function reactify(manager) {
  var createDragItem = manager.createDragItem.bind(manager);
  var createDropzone = manager.createDropzone.bind(manager);

  manager.createDragItem = (...args)=> patchItem(createDragItem(...args));
  manager.createDropzone = (...args)=> patchItem(createDropzone(...args));

  return manager;
};

function patchItem(dragItemOrDropzone) {
  dragItemOrDropzone.attach = function(element) {
    if (element) {
      dragItemOrDropzone.attachToElement(element);
    } else {
      dragItemOrDropzone.unattachFromElement();
    }
  };
  return dragItemOrDropzone;
}
