var m = require('mithril');
var Dnd = require('../domless-dnd');
var mithrilWrapper = require('../domless-dnd/wrappers/mithril')

var Box = {
  create: function(data) {
    var instance = Object.create(this.instance);
    instance.items = data || [];
    return instance;
  },
  instance: {
    items: null,
    remove: function(item) {
      this.items = this.items.filter(item => item !== item);
    },
    add: function(item) {
      this.items.push(item);
    }
  }
};

var App = {
  controller: function() {
    this.dnd = mithrilWrapper(Dnd.create(), m);

    this.data = [{ name: 'Foo' }, { name: 'Baz' }];
    this.boxes = [
      Box.create(this.data),
      Box.create()
    ];

    this.di1 = dnd.createDragItem({ itemData: { item: this.data[0] } });
    this.di2 = dnd.createDragItem({ itemData: { item: this.data[1] } });

    this.createBoxDropzone = box => {
      return this.dnd.createDropzone({
        onDrop: dragItem => {
          var item = dragItem.getItemData('item');
          box.remove(item);
          box.add(item);
        }
      });
    };

    this.zones = this.boxes.map(box => this.createBoxDropzone(box));
  },
  view: function(ctrl) {
    return m('.demo-app',
      m('.box-list', ctrl.boxes.map(function(box, i) {
        return m('.box' + '.box-' + (i+1), { key: i }, box.items.map(item => {
          return m('.item', { key: item.name }, item.name);
        }));
      }))
    );
  }
};

function fizzBuzzView(val) {
  var cssClass = val ? '.green-text' : '.red-text';
  return m('span' + cssClass, val);
}

m.mount(document.body, App);
Inspector.mount();

function createBoxDropzone(dnd, i) {
}
