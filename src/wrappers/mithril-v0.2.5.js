import { assert } from '../utils/core';
import throttle from '../utils/throttle';

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
    if (isInitialized) { return; }
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

/**
  Wrapper function for handlers for non-standard events that tells mithril to redraw
  This is needed as mithril doesn't know how to handle non-standard events by default.
  Also useful for any event handlers that need to be manually added/removed
  outside of a mithril view function (e.g. 3rd party library).
**/

// this is based off of mithril's internal 'autoredraw' function
function handleWithRedraw(m, callback, opts) {
  var opts = opts || {};
  var isThrottled = !!opts.throttleDelayAmount;
  var isWaitingForRedraw = false;

  var redraw = function() {
    m.endComputation();
    isWaitingForRedraw = false;
  };
  redraw = isThrottled ? throttle(redraw, opts.throttleDelayAmount) : redraw;

  return function(event) {
    if (!isWaitingForRedraw) {
      m.startComputation();
      isWaitingForRedraw = true;
    }
    try {
      callback.call(this, event);
    } finally {
      redraw();
    }
  };
}
