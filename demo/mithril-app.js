import m from 'mithril';
import Dnd from '../finesse-dnd';
import throttle from '../throttle';

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
  oninit: function() {
    window.ctrl = this;

    var redraw = ()=> m.redraw();
    this.dnd = Dnd.create({
      onmousedown:  redraw,
      onmouseup:    redraw,
      onmousemove:  throttle(redraw, 100)
    });

    this.data = [{ name: 'Foo' }, { name: 'Baz' }, { name: 'Testing..' }];
    this.boxes = [Box.create(), Box.create()];

    this.data.forEach((item, index) => {
      item.dragItem = this.dnd.createDragItem({ itemData: { item } });
      this.boxes[0].add(item);
    });

    this.createBoxDropzone = box => this.dnd.createDropzone({
      onDrop: dragItem => {
        var item = dragItem.getItemData('item');
        item.box.remove(item);
        box.add(item);
      }
    });

    this.zones = this.boxes.map(box => this.createBoxDropzone(box));

    document.addEventListener('keyup', (event)=> {
      if (event.shiftKey && event.keyCode === 27) { this.dnd.startDebug(); }
    }, false);
  },

  view: function() {
    return m('.demo-app',
      m('.box-list', this.boxes.map((box, i)=> {
        return m('.box' + '.box-' + (i+1), {
          key: i,
          oncreate: vnode => this.zones[i].attachToElement(vnode.dom)
        }, box.items.map(item => m('.item', {
          key: item.name,
          oncreate: vnode => item.dragItem.attachToElement(vnode.dom)
        }, item.name)));
      }))
    );
  }
};

m.mount(document.body, App);
