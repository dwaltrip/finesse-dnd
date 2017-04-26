
export default function reactify(manager, m) {
  var _createDragItem = manager.createDragItem;
  var _createDropzone = manager.createDropzone;

  manager.createDragItem = function() {
    return wrapItem(_createDragItem.apply(manager, arguments));
  };
  manager.createDropzone = function() {
    return wrapItem(_createDropzone.apply(manager, arguments));
  };

  return manager;
};

function wrapItem(dragItemOrDropzone) {
  dragItemOrDropzone.syncToNode = function(element) {
    if (element) {
      dragItemOrDropzone.attachToElement(element);
    } else {
      dragItemOrDropzone.unattachFromElement();
    }
  };
  return dragItemOrDropzone;
}
