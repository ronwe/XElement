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
	watch: {
		age: (arg) => console.log('watching', this, arg)
	},
  computed: {
    ageTip: ({props}) => `I'am ${props.age} years old`
  },
  events: [ 
		'attrChange'
  ],
  publicly: {
		updateAttrName: function(newName) {
			let {props, attrs, methods} = this;
      attrs.name = newName;
			methods.click();
		}
  },
	methods: {
    watchName: function() {
			let {props, attrs, events} = this;
			console.log('attribute name changed');
			events.attrChange.emit(attrs.name);

    },
		click: function(...args){
			console.log(this, args);
			let {props, attrs, events} = this;
			/*
      attrs.name = 'John';
      if (!i++) {
			props.members[0].name  = 'peter' + (+new Date);
      }
			props.members.push({name: 'kate'},{name: 'alibaba'});
			props.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
			*/
			props.members.unshift({name: 'jack'});
			//props.members = [{name: 'hax'}];
			props.age++;
      //props.a = {b: {c: 2}};
      //props.a.b = {c: 2};
      //props.a.b.c = attribute.name;
		}
	},
	template: `
	<div>
		<slot name="title">Default Title</slot>
		<p onClick="click(age, 2)">age: {{age * 2 + ' years old' }} {{a.b.c}}</p>
		<!-- blah -->
    {{ageTip}}
		<ul x-for="m in members" >
			<li>
				<sup></sup> 
				{{m.name}}
				<slot></slot>
			</li>	
		</ul>
	</div>`
}

define('user-card', userCard);
