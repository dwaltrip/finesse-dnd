import React, { Component, PureComponent } from 'react';
import ReactDOM from 'react-dom';

import Dnd from '../src';
import reactify from '../src/wrappers/react';

var r = React.createElement;

var dnd = reactify(Dnd.create());

const DATA = [
  { name: 'Foo' },
  { name: 'Baz' },
  { name: 'Testing..' },
  { name: 'Do all the good shit' },
];

class Box extends PureComponent {
  render() {
    var { items, dropzone, i } = this.props;
    console.log('rendering box ' + i);
    var boxClasses = `box box-${i+1}`;
    return r('div', {
      className: boxClasses,
      ref: dropzone.syncToNode
    }, items.map(item => {
      return r('div', {
        className: 'item',
        ref: item.dragItem.syncToNode,
        key: item.name
      }, item.name);
    }));
  }
}

class App extends Component {
  constructor(props) {
    super(props);

    DATA.forEach(item => {
      item.dragItem = dnd.createDragItem({ itemData: { item } });
    });

    this.state = {
      itemLists: [DATA.slice(), [], []]
    };

    this.dropzones = this.state.itemLists.map((_, destListIndex) => {
      return dnd.createDropzone({
        onDrop: dragItem => {
          var itemToMove = dragItem.getItemData('item');
          var isDroppingOnSelf = this.state.itemLists[destListIndex].indexOf(itemToMove) > -1;

          var prevLists = this.state.itemLists;

          if (isDroppingOnSelf) {
            var itemLists = [].concat(
              prevLists.slice(0, destListIndex),
              [prevLists[destListIndex].filter(item => item !== itemToMove).concat([itemToMove])],
              prevLists.slice(destListIndex + 1)
            )
          } else {
            var itemLists = prevLists.map((items, i)=> (i === destListIndex ?
              items.concat(itemToMove) :
              (items.indexOf(itemToMove) > -1 ? items.filter(item => item !== itemToMove) : items)
            ));
          }

          this.setState({ itemLists });
        }
      });
    });
  }
  render() {
    return r('div', { className: 'demo-app' }, r('div', { className: 'boxes' },
      this.state.itemLists.map((items, i) => {
        var dropzone = this.dropzones[i];
        return r(Box, { items, dropzone, i, key: i });
      })
    ));
  }
}

ReactDOM.render(r(App), document.getElementById('root'));
