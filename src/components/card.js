import {
	define
}  from '/lib/index.js';


let userCard  = {
	property: {
		age: 3,
		members: [
			{name: 'john'}
		]
	},
	method: {
		click: function(evt){
			let {property} = this;
			property.age++;
		}
	},
	template: `
	<div onClick="click">
		<p>age: {{age * 2 + ' years old'}}</p>
		<!-- blah -->
		<ul x-for="members" >
			<li>{{name}}</li>	
		</ul>
	</div>`
}

define('user-card', userCard);
