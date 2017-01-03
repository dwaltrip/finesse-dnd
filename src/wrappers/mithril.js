import { assert } from '../utils/core';
import handleWithRedraw from './handle-with-redraw';

export default function forMithril(manager, m) {
  var _createDragItem = manager.createDragItem;
  var _createDropzone = manager.createDropzone;

  manager.createDragItem = function() {
    return mithrilifyItemOrZone(_createDragItem.apply(manager, arguments));
  };
  manager.createDropzone = function() {
    return mithrilifyItemOrZone(_createDropzone.apply(manager, arguments));
  };

  // TODO: this is sloppy
  manager.eventHandlerDecorator = eventHandlerDecorator;
  assert(!!m, 'Must pass the mithril object');
  manager.m = m;

  return manager;
};


function mithrilifyItemOrZone(dragItemOrDropzone) {
  var _attachToElement = dragItemOrDropzone.attachToElement;

  dragItemOrDropzone.attachToElement = function(element, isInitialized, context) {
    if (isInitialized && dragItemOrDropzone.onViewUpdate) {
      dragItemOrDropzone.onRedraw(element); // we use this to re-add the dragHandle CSS class
    }

    _attachToElement.call(dragItemOrDropzone, element);
    context.onunload = ()=> dragItemOrDropzone.unattachFromElement();
  };

  return dragItemOrDropzone;
}

// TODO: this still isn't ideal, as it requires that the user of finesse-dnd
// knows how the library implementation makes use of the low level mouse events.
// Perhaps creating higher level names like 'dragmove', 'dragover', 'dragend', etc would solve this?
function eventHandlerDecorator(m, eventName, handler) {
  if (['mousedown', 'mouseup', 'mouseenter', 'mouseleave'].indexOf(eventName) > -1) {
    return handleWithRedraw(m, handler);
  } else if (eventName === 'mousemove') {
    return handleWithRedraw(m, handler, { throttleDelayAmount: 100 });
  } else {
    throw new Error('mouseEventHandlerDecorator -- invalid event:', eventName)
  }
}
