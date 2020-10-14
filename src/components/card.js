import {
	define
}  from '/lib/index.js';


var i = 0;
let userCard  = {
	props: {
		age: 3,
		a: { b : {c:1}},
		members: [
			{name: 'john'}
		]
	},
  attrs: {
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
			let {props, attribute} = this;
      attribute.name = newName;
		}
  },
	methods: {
    watchName: function() {
			let {props, attrs, events} = this;
      console.log('attribute', attrs, attrs.name);
			events.attrChange(attrs.name);

    },
		click: function(evt){
			let {props, attrs, events} = this;
			/*
      attrs.name = 'John';
      if (!i++) {
			props.members[0].name  = 'peter' + (+new Date);
      }
			*/
			props.members.push({name: 'kate'},{name: 'alibaba'});
			props.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
			props.members.unshift({name: 'jack'});
			//props.members = [{name: 'hax'}];
			props.age++;
      //props.a = {b: {c: 2}};
      props.a.b = {c: 2};
      //props.a.b.c = attribute.name;
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
