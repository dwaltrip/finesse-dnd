## Finesse-Dnd

This is a **work in progress**. The primary reason this library exists is to power a drag-n-drop visual programming UI (inspired by Google Blockly and Scratch). I will continue to polish this library up as I work on that project, and hope to release a battle-tested v1.0 later this year.

#### Design goals
* Decouple drag operations from the DOM, as many modern JavaScript frameworks assume that the DOM never holds any state. Integration with libraries such as Mithril and React should be seamless.
* Provide very fine-grained control with as friendly an API as possible
* Avoid HTML5 Drag n Drop, as it has some severe limitations.

#### Notes

Optimized APIs for common drag-n-drop interactions such as list items than can be reordered, etc are not provided out of the box. They can be implemented without too much difficulty. If you are building a more specialized drag-n-drop UI, this libray may work welll for you. Keep in mind that is a **work in progress**, and needs some polishing and performance optimizing.

See the demo app for a basic example. I will add API documentation as the project stabilizes.

```
git clone https://github.com/dwaltrip/finesse-dnd.git
cd finesse-dnd
npm install
npm run build:demo
open demo/index.html
```
