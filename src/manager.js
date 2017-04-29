
import DragItem from './drag-item';
import Dropzone from './dropzone';

import { ACCEPT_ALL, DEFAULT_GROUP, DRAG_HANDLE_CSS_CLASS } from './constants';
import { addStylesheetRules, removeFromArray } from './utils/core';

const DRAG_STATE_PRE_DRAG = 'PRE_DRAG';
const DRAG_STATE_MID_DRAG = 'MID_DRAG';
const DRAG_STATE_NONE = 'NONE';

export default {
  create: function(opts) {
    var opts = opts || {};
    var instance = Object.create(this.instance);

    instance.dragItemGroups = {};
    instance.dropzonesByAcceptType = { [ACCEPT_ALL]: [] };

    if (opts.eventHandlerDecorator) {
      instance.eventHandlerDecorator = opts.eventHandlerDecorator;
    }

    instance.finalEventHandlers = {
      mousedown:  opts.onmousedown  || null,
      mouseup:    opts.onmouseup    || null,
      mousemove:  opts.onmousemove  || null
    };

    addStylesheetRules([`.${DRAG_HANDLE_CSS_CLASS}:hover { cursor: move; }`]);

    return instance;
  },

  instance: {
    dragItemGroups: null,
    dropzonesByAcceptType: null,
    eventHandlerDecorator: null,

    activeDragItem: null,
    targetDropzones: null,
    _isDebugging: null,
    _eligibleDropzones: null,
    _ineligibleDropzones: null,
    _dragState: DRAG_STATE_NONE,

    dropzoneCount: 0,
    dragItemCount: 0,

    isPreDrag: function() { return this._dragState === DRAG_STATE_PRE_DRAG; },
    isMidDrag: function() { return this._dragState === DRAG_STATE_MID_DRAG; },

    isDragging: function() { return this.isPreDrag() || this.isMidDrag(); },
    isNotDragging: function() { return this._dragState === DRAG_STATE_NONE; },

    isDebugging: function() { return this._isDebugging; },

    startDebug: function() {
      if (this.activeDragItem) { this.activeDragItem._removeListeners(); }
      this._isDebugging = true;
    },

    finishDebug: function() {
      if (this.activeDragItem) { this.activeDragItem._postDragCleanup(); }
      this._isDebugging = false;
    },

    createDragItem: function(opts) {
      opts = opts || {};
      var newDragItem = DragItem.create(this, opts);
      this.dragItemCount += 1;
      newDragItem.id = this.dragItemCount;

      var group = newDragItem.group;
      if (!(group in this.dragItemGroups)) {
        this.dragItemGroups[group] = [];
      }
      this.dragItemGroups[group].push(newDragItem);

      return newDragItem;
    },

    createDropzone: function(opts) {
      opts = opts || {};
      var newDropzone = Dropzone.create(this, opts);
      this.dropzoneCount += 1;
      newDropzone.id = this.dropzoneCount;

      if (newDropzone.doesAcceptAll()) {
        this.dropzonesByAcceptType[ACCEPT_ALL].push(newDropzone);
      } else {
        newDropzone.accepts.forEach(group => {
          if (!(group in this.dropzonesByAcceptType)) {
            this.dropzonesByAcceptType[group] = [];
          }
          this.dropzonesByAcceptType[group].push(newDropzone);
        });
      }

      return newDropzone;
    },

    wrapHandler: function(eventName, handler) {
      if (this.eventHandlerDecorator) {
        // TODO: this now knows about the mithril object
        // Fix this, so that this class has no knowledge of the mithril object
        // Move this knowledge into the mithril-helpers module
        return this.eventHandlerDecorator(this.m ,eventName, handler);
      }
      // New, somewhat approach. Still not ideal, should be using our custom drag hooks.
      else if (this.finalEventHandlers[eventName] || this.finalEventHandlers.default) {
        var finalHandler = (this.finalEventHandlers[eventName] || this.finalEventHandlers.default).bind(this);
        return function(event) {
          handler.call(this, event);
          finalHandler(event);
        };
      }
      return handler;
    },

    hasTargetDropzone: function() {
      return this.targetDropzones && this.targetDropzones.length > 0;
    },

    isTargetingDropzoneGroup: function(group) {
      if (!this.isMidDrag()) { return false; }

      var targetDropzone = this.targetDropzone();
      return !!targetDropzone && targetDropzone.group === group;
    },

    removeDragItem: function(dragItem) {
      removeFromArray(this.dragItemGroups[dragItem.group], dragItem);
    },

    removeDropzone: function(dropzone) {
      if (dropzone.doesAcceptAll()) {
        removeFromArray(this.dropzonesByAcceptType[ACCEPT_ALL], dropzone);
      } else {
        dropzone.accepts.forEach(group => {
          removeFromArray(this.dropzonesByAcceptType[group], dropzone);
        });
      }
    },

    onDrop: function() {
      var targetDropzone = this.targetDropzone();
      if (targetDropzone) {
        targetDropzone.userEvents.onDrop.call(targetDropzone, this.activeDragItem);
        targetDropzone.removeCssClassForDropTarget();
      }
    },

    onMouseMove: function(event) {
      this.handleCustomEventConstraints();
    },

    isManuallyHandlingDragEvents: function() {
      return this.isCheckingElementOverlap || this.activeDragItem.hasCustomDragRect;
    },

    // TODO: clarify this method. We are doing a few things all at once here.
    handleCustomEventConstraints: function() {
      var hasCustomDragRect = this.activeDragItem.hasCustomDragRect;
      var dragRect = this.activeDragItem.getDragRect();

      // Get all bounding rects at once, to avoid unnecessary reflows/repaints
      var dropzoneRects = this._eligibleDropzones.reduce((memo, dropzone) => {
        memo[dropzone.id] = dropzone._element.getBoundingClientRect();
        return memo;
      }, {});;

      if (this.isCheckingElementOverlap || hasCustomDragRect) {
        this._eligibleDropzones.forEach(dropzone => {
          if (
            (dropzone.useDragElementOverlap || hasCustomDragRect) &&
            !dropzone.isUnderDragItem() && doRectsOverlap(dragRect, dropzoneRects[dropzone.id])
          ) {
            dropzone.handleDragEnter();
          }
        });
        this.targetDropzones.forEach(dropzone => {
          if (
            (dropzone.useDragElementOverlap || hasCustomDragRect) &&
            !doRectsOverlap(dragRect, dropzoneRects[dropzone.id])
          ) {
            dropzone.handleDragLeave();
          }
        });
      }
    },

    // `targetDropzones` is essentially a stack of dropzones we have enetered.
    // Only the most recently entered one is used.
    // The assumption that this is the sensible and always desired has not been fully validated.
    targetDropzone: function() {
      return (this.targetDropzones || []).slice(-1).pop() || null;
    },

    onDragEnter: function(dropzone) {
      if (this.targetDropzone()) {
        this.activeDragItem.dragCursor.classList.remove(getDropTargetClass(this.targetDropzone()));
        this.targetDropzone().removeCssClassForDropTarget();
      }
      this.targetDropzones.push(dropzone);
      dropzone.addCssClassForDropTarget();
      var dragOverClass = getDropTargetClass(dropzone);
      this.activeDragItem.dragCursor.classList.add(dragOverClass);
    },

    onDragLeave: function(dropzone) {
      var wasRemoved = removeFromArray(this.targetDropzones, dropzone);
      if (!wasRemoved) {
        throw new Error('onmouseleave -- this should not happen. dropzone not in targetDropzones list');
      }
      this.activeDragItem.dragCursor.classList.remove(getDropTargetClass(dropzone));
      dropzone.removeCssClassForDropTarget();
      if (this.targetDropzone()) {
        this.targetDropzone().addCssClassForDropTarget();
        this.activeDragItem.dragCursor.classList.add(getDropTargetClass(this.targetDropzone()));
      }
    },

    _handlePreDrag: function() {
      this._dragState = DRAG_STATE_PRE_DRAG;
    },

    _startDrag: function(dragItem, event) {
      this._dragState = DRAG_STATE_MID_DRAG;
      this.activeDragItem = dragItem;
      this.targetDropzones = [];

      this._eligibleDropzones = [];
      this._ineligibleDropzones = [];
      // prep dropzones
      var dropzones = this.dropzonesByAcceptType[ACCEPT_ALL].concat(
        this.dropzonesByAcceptType[dragItem.group] || []
      );

      dropzones.filter(dropzones => dropzones.isEnabled()).forEach(dropzone => {
        if (dropzone.canAcceptDrop(dragItem)) {
          dropzone._prepForDragAndDrop(event);
          this._eligibleDropzones.push(dropzone);
        } else {
          dropzone.disable();
          this._ineligibleDropzones.push(dropzone);
        }
      });

      this.isCheckingElementOverlap = !!this._eligibleDropzones.find(dz => dz.useDragElementOverlap);

      // Upon drag start, identify dropzones that should be considered 'targeted' by dragItem
      // and trigger 'dragEnter' for these dropzones.
      var mousePos = { x: event.clientX, y: event.clientY };
      var dragRect = dragItem.getDragRect();
      var dropzoneRects = this._eligibleDropzones.map(dz => dz._element.getBoundingClientRect());

      this._eligibleDropzones.forEach((dropzone, i) => {
        var dropzoneRect = dropzoneRects[i];
        var isCheckingOverlap = dropzone.useDragElementOverlap;

        var doesOverlap = doRectsOverlap(dropzoneRect, dragRect);
        var containsCursor = doesRectContainPoint(dropzoneRect, mousePos);

        if ((isCheckingOverlap && doesOverlap) || (!isCheckingOverlap && containsCursor)) {
          dropzone.handleDragEnter();
        }
      });
    },

    _postDragCleanup: function() {
      this._dragState = DRAG_STATE_NONE;
      this._eligibleDropzones.forEach(dropzone => dropzone._postDragCleanup());
      this._eligibleDropzones = [];
      this.isCheckingElementOverlap = false;
      
      this.activeDragItem = null;
      this.targetDropzones = [];

      this._ineligibleDropzones.forEach(dropzone => dropzone.enable());
      this._ineligibleDropzones = [];
    },
  }
};

function getDropTargetClass(dropzone) {
  return `drop-target--${dropzone.group}`;
}

function doRectsOverlap(rect1, rect2) {
  return !(
    rect1.right   < rect2.left  ||
    rect1.left    > rect2.right ||
    rect1.bottom  < rect2.top   ||
    rect1.top     > rect2.bottom
  );
}

function doesRectContainPoint(rect, point) {
  return (rect.left <= point.x &&   point.x <= rect.right &&
          rect.top  <= point.y &&   point.y <= rect.bottom);
}
