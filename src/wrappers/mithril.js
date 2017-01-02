import { assert } from '../utils/core';
import handleWithRedraw from './handle-with-redraw';

export default function wrap(metalDragon, m) {
  var _createDragItem = metalDragon.createDragItem;
  var _createDropzone = metalDragon.createDropzone;

  metalDragon.createDragItem = function() {
    return mithrilifyItemOrZone(_createDragItem.apply(metalDragon, arguments));
  };
  metalDragon.createDropzone = function() {
    return mithrilifyItemOrZone(_createDropzone.apply(metalDragon, arguments));
  };

  // TODO: this is sloppy
  metalDragon.eventHandlerDecorator = eventHandlerDecorator;
  assert(!!m, 'Must pass the mithril object');
  metalDragon.m = m;

  return metalDragon;
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

// TODO: this still isn't ideal, as it requires that the user of metal-dragon
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
