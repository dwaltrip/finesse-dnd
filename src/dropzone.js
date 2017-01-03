import { assert } from './utils/core';
import { DEFAULT_GROUP, DROP_TARGET_CSS_CLASS } from './constants';

export default {
  create: function(manager, opts) {
    var instance = Object.create(this.instance);

    instance.manager = manager;
    instance.group = opts.group || DEFAULT_GROUP;

    instance.userEvents = {
      onDragStart: opts.onDragStart || doNothing,
      onDragEnter: opts.onDragEnter || doNothing,
      onDragLeave: opts.onDragLeave || doNothing,
      onDrop: opts.onDrop || doNothing
    };

    instance._onMouseenter = manager.wrapHandler('mouseenter', instance._onMouseenter);
    instance._onMouseleave = manager.wrapHandler('mouseleave', instance._onMouseleave);

    instance._boundEventListeners = {
      onmouseenter: (event) => instance._onMouseenter(event),
      onmouseleave: (event) => instance._onMouseleave(event)
    };

    instance.dropTargetClass = typeof opts.dropTargetClass !== 'undefined' ?
      opts.dropTargetClass : DROP_TARGET_CSS_CLASS;

    if (opts.accepts) {
      var accepts = opts.accepts;
      instance.accepts = (accepts instanceof Array) ? accepts : [accepts];
      instance._restrictDropTypes = true;
    }
    instance._canAcceptDrop = opts.canAcceptDrop;

    instance.useDragElementOverlap = opts.useDragElementOverlap || false;

    // TODO: we are starting to have more functionality that is idential between dropzones
    // and dragitems, such as this itemData stuff. Consider making a base class?
    instance._itemData = {};
    if (opts.itemData) {
      Object.keys(opts.itemData).forEach(key => instance._itemData[key] = opts.itemData[key]);
    }
    if (opts.element) {
      instance.attachToElement(opts.element);
    }

    return instance;
  },

  instance: {
    accepts: null,
    _restrictDropTypes: false,
    _isReadyForDrop: false,
    _element: null, 
    _boundEventListeners: null,
    _isEnabled: true,
    _itemData: null,
    _canAcceptDrop: null,

    hasElement:       function() { return !!this._element; },
    isUnderDragItem:  function() { return this._isDraggingOver; },
    isDropTarget:     function() { return this === this.manager.targetDropzone(); },
    isReadyForDrop:   function() { return this._isReadyForDrop; },
    doesAcceptAll:    function() { return !this._restrictDropTypes; },

    attachToElement: function(element) {
      this._element = element;
    },

    canAcceptDrop: function(dragItem) {
      if (!this._canAcceptDrop) { return true; }
      return this._canAcceptDrop(dragItem);
    },

    // TODO: finalize the API and expectations around attaching / unattaching and enabling / disabling dropzones.
    // E.g. If a UI widget is removed from the DOM for a bit and then is brought back, the dev shouldn't have to
    // manually specificy that it is disabled while it is unattached from the DOM. This implementation of
    // 'isEnabled' fixes that for now. However, now the 'hasElement' check in _prepForDragAndDrop is irrelevant.
    isEnabled: function() { return this._isEnabled && !!this._element; },
    disable:  function() { this._isEnabled = false; },
    enable:   function() { this._isEnabled = true; },

    setItemData: function(key, value) {
      this._itemData[key] = value;
    },

    getItemData: function(key, defaultValue) {
      var errorMsg = `Dropzone.getItemData - Invalid key '${key}'. Valid keys: ${Object.keys(this._itemData)}`;
      var hasDefault = typeof defaultValue !== 'undefined';
      assert(key in this._itemData || hasDefault, errorMsg);
      return key in this._itemData ? this._itemData[key] : defaultValue;
    },

    destroy: function() {
      this.manager.removeDropzone(this);
    },

    addCssClassForDropTarget: function() {
      if (this.dropTargetClass) {
        this._element.classList.add(this.dropTargetClass);
      }
    },
    removeCssClassForDropTarget: function() {
      if (this.dropTargetClass) {
        this._element.classList.remove(this.dropTargetClass);
      }
    },

    _prepForDragAndDrop: function(event) {
      this._isReadyForDrop = true;

      if (!this.hasElement()) {
        var errorMsg = [
          `dropzone (id: ${this.id}, group: ${this.group},`,
          `accepts: ${this.accepts ? `[${this.accepts.join(', ')}]` : null}) is not attached to an element.`,
          '\nDid you forget to call dropzone.destroy()?'
        ].join(' ');
        throw new Error(errorMsg);
      }

      if (!this.manager.isManuallyHandlingDragEvents()) {
        this._element.addEventListener('mouseenter', this._boundEventListeners.onmouseenter, false);
        this._element.addEventListener('mouseleave', this._boundEventListeners.onmouseleave, false);
      }

      this.userEvents.onDragStart.call(this, this.manager.activeDragItem, event);
    },

    _onMouseenter: function(event) { this.handleDragEnter(event); },
    _onMouseleave: function(event) { this.handleDragLeave(event); },

    handleDragEnter: function(event) {
      if (this._isEnabled) {
        this._isDraggingOver = true;
        this.manager.onDragEnter(this);
        this.userEvents.onDragEnter.call(this, this.manager.activeDragItem, event);
      }
    },

    handleDragLeave: function(event) {
      if (this._isEnabled) {
        this._isDraggingOver = false;
        this.manager.onDragLeave(this);
        this.userEvents.onDragLeave.call(this, this.manager.activeDragItem, event);
      }
    },

    // TODO: not sure if this makes sense or is useful
    unattachFromElement: function() {
      this._element = null;
    },

    _postDragCleanup: function() {
      if (!this.manager.isManuallyHandlingDragEvents()) {
        this._element.removeEventListener('mouseenter', this._boundEventListeners.onmouseenter);
        this._element.removeEventListener('mouseleave', this._boundEventListeners.onmouseleave);
      }

      this._isReadyForDrop = false;
      this._isDraggingOver = false;
      // NOTE: would we ever rely on a dropzone remaining disabled between drags?
      // I think we may, so I leave this commented out
      // Essentially, user always has to manually re-enable the dropzone: `dropzone.enable()`
      // this._isEnabled = true;
    }
  }
};

function doNothing() {}
