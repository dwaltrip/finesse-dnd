import throttle from '../utils/throttle';

/*
TODO: The library user doesn't generally care about `mousedown`, mouseup`, or `mousemove`.
      They primarily care about the named drag events that we are already using for the `userHooks` API.

DragItem hooks:
 - beforeDrag
 - onDragStart
 - onDrop
 - afterDrag
 - afterDrop
 - onDragCancel

DropZone hooks:
 - onDragStart
 - onDragEnter
 - onDragLeave
 - onDrop

The manager API for passing global event handlers should use the above names
Not the underlying mouse events
*/

export function defaultRedrawHandlers(m) {
  var redraw = ()=> m.redraw()
  return {
    onmousedown:  redraw,
    onmouseup:    redraw,
    onmousemove:  throttle(redraw, 100)
  }
};
