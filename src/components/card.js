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
			/*
			property.members[0].name  = 'peter';
			*/
			//property.members = [{name: 'hax'}];
			property.members.push({name: 'kate'},{name: 'alibaba'});
			//property.members.splice(1, 1, {name: 'kevin'}, {name: 'tony'});
		}
	},
	template: `
	<div>
		<p onClick="click">age: {{age * 2 + ' years old' }} {{a.b.c}}</p>
		<!-- blah -->
		<ul x-for="(m, i) in members" >
			<li><sup>{{i}}</sup> {{m.name}}</li>	
		</ul>
	</div>`
}

define('user-card', userCard);
