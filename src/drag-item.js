import { assert } from './utils/core';
import { DEFAULT_GROUP, DRAG_HANDLE_CSS_CLASS, IS_DRAGGING_CSS_CLASS } from './constants';

// TODO: allow user to change this
const MIN_DIST_FOR_DRAG_START = 10;

export default {
  create: function(manager, opts) {
    var instance = Object.create(this.instance);

    instance.manager = manager;
    instance.group = opts.group || DEFAULT_GROUP;

    instance._getDragCursorSourceNode = opts.getDragCursorSourceNode || (el => el);
    instance._dragHandleClass = opts.dragHandle;
    instance.dragCursorClass = opts.dragCursorClass || 'drag-cursor';

    instance._onMousedown = manager.wrapHandler('mousedown', instance._onMousedown);
    instance._onMousemove = manager.wrapHandler('mousemove', instance._onMousemove);
    instance._onMouseup = manager.wrapHandler('mouseup', instance._onMouseup);

    instance._boundEventListeners = {
      onmousedown: (event) => {
        instance._onMousedown(event);
        event.stopPropagation();
        event.preventDefault();
      },
      onmousemove: (event) => {
        instance._onMousemove(event);
        event.stopPropagation();
        event.preventDefault();
      },
      onmouseup:   (event) => {
        instance._onMouseup(event);
        event.stopPropagation();
      }
    };

    instance.userEvents = {
      beforeDrag: opts.beforeDrag || doNothing,
      onDragStart: opts.onDragStart || doNothing,
      onDrop: opts.onDrop || doNothing,
      afterDrag: opts.afterDrag || doNothing,
      afterDrop: opts.afterDrop || doNothing,
      onDragCancel: opts.onDragCancel || doNothing
    };

    instance.userHooks = {
      postProcessDragCursor: opts.postProcessDragCursor || doNothing
    };

    instance.hasCustomDragRect = !!opts.dragRect;
    if (instance.hasCustomDragRect) {
      instance._dragRect = opts.dragRect;
      instance._validateDragRect();
    }

    instance.isMovementConstrained = false;
    if (opts.constraints || opts.boundingContainer) {
      instance.isMovementConstrained = true;
      if (opts.constraints && opts.constraints.getBoundingElement) {
        instance.getBoundingElement = opts.constraints.getBoundingElement;
      } else {
        var className = opts.boundingContainer;
        instance.getBoundingElement = (element) => findAncestorWithClass(element, className);
      }
    }

    instance._itemData = {};
    if (opts.itemData) {
      Object.keys(opts.itemData).forEach(key => instance._itemData[key] = opts.itemData[key]);
    }

    return instance;
  },

  instance: {
    manager: null,
    dragCursor: null,
    _itemData: null,
    _dragData: null,
    _element: null,
    _boundEventListeners: null,
    _dragRect: null,

    isDragging: function() {
      return this === this.manager.activeDragItem;
    },

    setDragData: function(key, value) {
      this._dragData[key] = value;
    },

    getDragRect: function() {
      if (!this._dragCursorSize) {
        var rect = this.dragCursor.getBoundingClientRect();
        this._dragCursorSize = { width: rect.width, height: rect.height };
      }
      var left = this.lastMousePos.x - this.initialCursorOffset.x;
      var top = this.lastMousePos.y - this.initialCursorOffset.y
      var right = left + this._dragCursorSize.width;
      var bottom = top + this._dragCursorSize.height;

      if (!this.hasCustomDragRect) { return { top, left, right, bottom }; }

      // TODO: rename "_dragRect" to custom drag rect offset
      var dragRect = this._dragRect;
      return {
        top:      top    + dragRect.top,
        bottom:   top    + dragRect.top    + dragRect.height,
        left:     left   + dragRect.left,
        right:    left   + dragRect.left   + dragRect.width
      };
    },

    getDragData: function(key, defaultVal) {
      var errorMsg = `DragItem.getDragData - Invalid key '${key}'. Valid keys: ${Object.keys(this._dragData)}`;
      var hasDefault = typeof defaultVal !== 'undefined';
      assert(key in this._dragData || hasDefault, errorMsg);
      return key in this._dragData ? this._dragData[key] : defaultVal;
    },

    setItemData: function(key, value) {
      this._itemData[key] = value;
    },

    getItemData: function(key, defaultVal) {
      var errorMsg = `DragItem.getItemData - Invalid key '${key}'. Valid keys: ${Object.keys(this._itemData)}`;
      var hasDefault = typeof defaultVal !== 'undefined';
      assert(key in this._itemData || hasDefault, errorMsg);
      return key in this._itemData ? this._itemData[key] : defaultVal;
    },

    isAboveGroup: function(group) {
      return !!this.manager.targetDropzones.find(dz => dz.group === group);
    },

    destroy: function() {
      this.unattachFromElement()
      this.manager.removeDragItem(this);
    },

    _handlePreDrag: function(event) {
      this._dragData = {};
      this.mousedownPos = { x: event.clientX, y: event.clientY };
      document.addEventListener('mousemove', this._boundEventListeners.onmousemove, false);
      document.addEventListener('mouseup', this._boundEventListeners.onmouseup, false);
    },

    _prepForDrag: function(event) {
      var element = this._element;
      var rect = element.getBoundingClientRect();
      this.initialCursorOffset = {
        x: this.mousedownPos.x - rect.left,
        y: this.mousedownPos.y - rect.top
      };
      var dragCursor = this._setupDragCursor(element, event);
      this.userHooks.postProcessDragCursor(dragCursor);

      if (this.isMovementConstrained) {
        var container = this.getBoundingElement(element);
        var rect = container.getBoundingClientRect();
        var cursorSize = getFullSize(dragCursor);
        this._boundingRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right - cursorSize.width,
          bottom: rect.bottom - cursorSize.height
        };
      }
    },

    _startDrag: function() {
      this.dragCursor.style.display = '';
      this._element.classList.add(IS_DRAGGING_CSS_CLASS);
    },

    attachToElement: function(element) {
      this._element = element;
      if (this._dragHandleClass) {
        this._dragHandle = findChildWithClass(element, this._dragHandleClass);
        if (!this._dragHandle) {
          throw new Error(`DragItem: No drag-handle with class '${this._dragHandleClass}' was found`);
        }
      } else {
        this._dragHandle = element;
      }
      this._dragHandle.classList.add(DRAG_HANDLE_CSS_CLASS);
      this._dragHandle.addEventListener('mousedown', this._boundEventListeners.onmousedown, false);
    },

    // TODO: will this make sense or be useful to non-mithril users?
    onRedraw: function() {
      this._dragHandle.classList.add(DRAG_HANDLE_CSS_CLASS);
    },

    unattachFromElement: function() {
      if (this._dragHandle) {
        this._dragHandle.removeEventListener('mousedown', this._boundEventListeners.onmousedown, false);
        this._dragHandle.classList.remove(DRAG_HANDLE_CSS_CLASS);
      }
      this._dragHandle = null;
      this._element = null;
    },

    getBoundingElement: function() {
      throw new Error(`-- drag-item -- getBoundingElement must be specified in 'contraints' hash.`);
    },

    _setupDragCursor: function(element, event) {
      var sourceNode = this._getDragCursorSourceNode(element, event);
      var dragCursor = this.dragCursor = sourceNode.cloneNode(true);
      dragCursor.style.position = 'fixed';
      dragCursor.style.pointerEvents = 'none';
      dragCursor.style.display = 'none';
      dragCursor.classList.add(this.dragCursorClass);
      document.body.appendChild(dragCursor);
      return dragCursor;
    },

    _onMousedown: function(event) {
      if (!this.manager.isDebugging()) {
        this.manager._handlePreDrag();
        this._handlePreDrag(event);
        this.userEvents.beforeDrag.call(this, event);
      }
    },

    _onMousemove: function(event) {
      // NOTE: after the 'mousedown' event on a dragitem, we don't consider the drag
      // to have officially started until the first 'mousemove' event fires
      this.lastMousePos = { x: event.clientX, y: event.clientY };
      if (this.manager.isPreDrag() && this._isEligibleForDragStart()) {
        this.userEvents.onDragStart.call(this, event);
        this._prepForDrag(event);
        this._startDrag();
        this.manager._startDrag(this, event);
        document.documentElement.style.cursor = 'move';
        requestAnimationFrame(this._animateDragCursorPos.bind(this));
      }
      if (this.manager.isMidDrag()) {
        this.manager.onMouseMove(event);
      }
    },

    // TODO: should this be here, in DragItem? or should it be in the manager class?
    _onMouseup: function(event) {
      if (this.manager.isMidDrag()) {
        this.manager.onDrop();

        if (this.manager.hasTargetDropzone()) {
          this.userEvents.onDrop.call(this, event);
          this.userEvents.afterDrop.call(this, event);
        } else {
          this.userEvents.onDragCancel(this, event);
        }
      }
      this.userEvents.afterDrag.call(this, event);
      this._postDragCleanup();
    },

    _postDragCleanup: function() {
      if (this.dragCursor) { this.dragCursor.remove(); }
      this.dragCursor = null;
      this._dragCursorSize = null;
      this._dragData = {};
      if (this._element) {
        this._element.classList.remove(IS_DRAGGING_CSS_CLASS);
      }

      if (this.isMovementConstrained) {
        this._boundingRect = null;
      }

      this._removeListeners();

      if (this.manager.isPreDrag() || this.manager.isMidDrag()) {
        this.manager._postDragCleanup();
      }

      document.documentElement.style.cursor = '';
    },

    _removeListeners: function() {
      document.removeEventListener('mousemove', this._boundEventListeners.onmousemove, false);
      document.removeEventListener('mouseup', this._boundEventListeners.onmouseup, false);
    },

    // TODO: ensure this is always rendered in front of every other DOM element (stacking contexts, etc)
    _animateDragCursorPos: function() {
      if (this.manager.isMidDrag()) {
        requestAnimationFrame(this._animateDragCursorPos.bind(this));

        var left = this.lastMousePos.x - this.initialCursorOffset.x;
        var top = this.lastMousePos.y - this.initialCursorOffset.y
        if (this.isMovementConstrained) {
          left =  clamp(left, this._boundingRect.left,  this._boundingRect.right);
          top =   clamp(top,  this._boundingRect.top,   this._boundingRect.bottom);
        }
        this.dragCursor.style.left = `${left}px`;
        this.dragCursor.style.top = `${top}px`;
      }
    },

    _isEligibleForDragStart: function() {
      return distance(this.mousedownPos, this.lastMousePos) > MIN_DIST_FOR_DRAG_START;
    },

    _validateDragRect: function() {
      ['top', 'left', 'height', 'width'].forEach(attr => {
        if (typeof this._dragRect[attr] === 'undefined') {
          throw new Error(`drag-item -- '${attr}' is a required attribute for 'dragRect'.`);
        } else if (typeof this._dragRect[attr] !== 'number') {
          throw new Error(`drag-item -- 'dragRect.${attr}' must be a number.`);
        }
      });
    }
  }
};

function clamp(numberToClamp, min, max) {
  return Math.max(min, Math.min(numberToClamp, max));
}

function getFullSize(element) {
  var style = getComputedStyle(element);
  return {
    width: element.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginLeft),
    height: element.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
  };
}

function findChildWithClass(el, cls) {
  var children = el.getElementsByClassName(cls);
  return children[0];
}

function findAncestorWithClass(el, cls) {
  while ((el = el.parentElement) && !el.classList.contains(cls));
  return el;
}

function doNothing() {}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
