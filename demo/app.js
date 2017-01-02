import m from 'mithril';
import Dnd from '../src';
import mithrilWrapper from '../src/wrappers/mithril';

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

var App = {
  controller: function() {
    window.ctrl = this;
    this.dnd = mithrilWrapper(Dnd.create(), m);

    this.data = [{ name: 'Foo' }, { name: 'Baz' }, { name: 'Testing..' }];
    this.boxes = [Box.create(), Box.create()];

    this.data.forEach((item, index) => {
      item.dragItem = this.dnd.createDragItem({ itemData: { item } });
      this.boxes[0].add(item);
    });

    this.createBoxDropzone = box => {
      return this.dnd.createDropzone({
        onDrop: dragItem => {
          var item = dragItem.getItemData('item');
          item.box.remove(item);
          box.add(item);
        }
      });
    };

    this.zones = this.boxes.map(box => this.createBoxDropzone(box));

    document.addEventListener('keyup', (event)=> {
      if (event.shiftKey && event.keyCode === 27) { this.dnd.startDebug(); }
    }, false);
  },

  view: function(ctrl) {
    return m('.demo-app',
      m('.box-list', ctrl.boxes.map(function(box, i) {
        return m('.box' + '.box-' + (i+1), {
          key: i,
          config: ctrl.zones[i].attachToElement
        }, box.items.map(item => m('.item', {
          key: item.name,
          config: item.dragItem.attachToElement
        }, item.name)));
      }))
    );
  }
};

m.mount(document.body, App);
