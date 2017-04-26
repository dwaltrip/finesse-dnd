import React, { Component } from 'react';
import ReactDOM from 'react-dom';

// TODO: figure out how to make finesse-dnd work with React
// import Dnd from '../src';
// import mithrilWrapper from '../src/wrappers/mithril';

var r = React.createElement;

var Box = {
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

class App extends Component {
  constructor() {
    super();
    var boxes = [Box.create(), Box.create()];
    DATA.forEach(item => boxes[0].add(item));
    this.state = { boxes: boxes };
  }
  render() {
    return r('div', {
      className: 'demo-app'
    }, r('div', { className: 'box-list' }, this.state.boxes.map((box, i) => {
      var boxClasses = `box box-${i+1}`;
      return r('div', { className: boxClasses, key: i }, box.items.map(item => {
        return r('div', { className: 'item', key: item.name }, item.name);
      }));
    })));
  }
}

ReactDOM.render(r(App), document.getElementById('root'));
