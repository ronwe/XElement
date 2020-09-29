import {
	define
}  from '/lib/index.js';


let userCard  = {
	property: {
		age: 3,
		a: { b : {c:1}},
		members: [
			{name: 'john'}
		]
	},
	method: {
		click: function(evt){
			let {property} = this;
			property.age++;
			property.members[0].name  = 'peter';
			property.members.push({name: 'kate'});
		}
	},
	template: `
	<div>
		<p onClick="click">age: {{age * 2 + ' years old' }} {{a.b.c}}</p>
		<!-- blah -->
		<ul x-for="m in members" >
			<li>{{m.name}}</li>	
		</ul>
	</div>`
}

define('user-card', userCard);
