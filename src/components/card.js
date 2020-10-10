import {
	define
}  from '/lib/index.js';


var i = 0;
let userCard  = {
	property: {
		age: 3,
		a: { b : {c:1}},
		members: [
			{name: 'john'}
		]
	},
  attribute: {
    name: {
      default: 'Jerry',
      onChange: 'watchName'
    } 
  },
  events: [ 
		'attrChange'
  ],
  publicly: {
		updateAttrName: function(newName) {
			let {property, attribute} = this;
      attribute.name = newName;
		}
  },
	method: {
    watchName: function() {
			let {property, attribute, events} = this;
      console.log('attribute', attribute, attribute.name);
			events.attrChange(attribute.name);

    },
		click: function(evt){
			let {property, attribute, events} = this;
      attribute.name = 'John';
      /*
      if (!i++) {
			property.members[0].name  = 'peter' + (+new Date);
      }
			property.members.push({name: 'kate'},{name: 'alibaba'});
			property.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
			property.members.unshift({name: 'jack'});
			//property.members = [{name: 'hax'}];
			property.age++;
      //property.a = {b: {c: 2}};
      property.a.b = {c: 2};
      */
      //property.a.b.c = attribute.name;
		}
	},
	template: `
	<div>
		<p onClick="click">age: {{age * 2 + ' years old' }} {{a.b.c}}</p>
		<!-- blah -->
		<ul x-for="m in members" >
			<li><sup></sup> {{m.name}}<input /></li>	
		</ul>
	</div>`
}

define('user-card', userCard);
