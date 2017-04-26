import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import Dnd from '../src';
import reactify from '../src/wrappers/react';

var r = React.createElement;

var dnd = reactify(Dnd.create());

var BoxModel = {
  create: function(data) {
    var instance = Object.create(this.instance);
    instance.items = data || [];
    return instance;
  },
  instance: {
    items: null,
    remove: function(itemToRemove) {
      itemToRemove.box = null;
      this.items = this.items.filter(item => item !== itemToRemove);
    },
    add: function(item) {
      item.box = this;
      this.items.push(item);
    }
  }
};

const DATA = [{ name: 'Foo' }, { name: 'Baz' }, { name: 'Testing..' }];

class Box extends Component {
  render() {
    var { box, i } = this.props;
    var boxClasses = `box box-${i+1}`;
    return r('div', {
      className: boxClasses,
      ref: box.dropzone.syncToNode
    }, box.items.map(item => {
      return r('div', {
        className: 'item',
        ref: item.dragItem.syncToNode,
        key: item.name
      }, item.name);
    }));
  }
}

class App extends Component {
  constructor() {
    super();
    var boxes = [BoxModel.create(), BoxModel.create()];
    DATA.forEach(item => {
      item.dragItem = dnd.createDragItem({ itemData: { item } });
      boxes[0].add(item)
    });

    boxes.forEach(box => {
      box.dropzone = dnd.createDropzone({
        onDrop: dragItem => {
          var item = dragItem.getItemData('item');
          item.box.remove(item);
          box.add(item);
          this.forceUpdate();
        }
      });
    });

    this.state = { boxes: boxes };
  }
  render() {
    return r('div', { className: 'demo-app' }, r('div', { className: 'box-list' },
      this.state.boxes.map((box, i) => r(Box, { i, box, key: i }))
    ));
  }
}

ReactDOM.render(r(App), document.getElementById('root'));
