import {
	define
}  from '/lib/index.js';


var i = 0;
let userCard  = {
	property: {
		age: 3,
		a: { b : {}},
		members: [
			{name: 'john'}
		]
	},
	method: {
		click: function(evt){
			let {property} = this;
      /*
      if (!i++) {
			property.members[0].name  = 'peter' + (+new Date);
      }
			property.members.push({name: 'kate'},{name: 'alibaba'});
			property.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
			property.members.unshift({name: 'jack'});
			property.members = [{name: 'hax'}];
			property.age++;
      */
      property.a = {b: {c: 2}};
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
