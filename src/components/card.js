import {
	define
}  from '/lib/index.js';


var i = 0;
let userCard  = {
	properties: {
		age: 3,
		a: { b : {c:1}},
		members: [
			{name: 'john'}
		]
	},
  attributes: {
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
			let {properties, attribute} = this;
      attribute.name = newName;
		}
  },
	methods: {
    watchName: function() {
			let {properties, attributes, events} = this;
      console.log('attribute', attributes, attributes.name);
			events.attrChange(attributes.name);

    },
		click: function(evt){
			let {properties, attributes, events} = this;
			/*
      attributes.name = 'John';
      if (!i++) {
			properties.members[0].name  = 'peter' + (+new Date);
      }
			*/
			/*
			properties.members.push({name: 'kate'},{name: 'alibaba'});
			properties.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
			properties.members.unshift({name: 'jack'});
			//properties.members = [{name: 'hax'}];
			properties.age++;
      //properties.a = {b: {c: 2}};
      properties.a.b = {c: 2};
      //properties.a.b.c = attribute.name;
			*/
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
