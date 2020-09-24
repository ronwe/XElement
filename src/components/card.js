import {
	define
}  from '/lib/index.js';


let userCard  = {
	property: {
		age: 3
	},
	method: {
		click: () => {
			console.log(this);
		}
	},
	template: `
	<div onClick="click">
		<p>age: {{age * 2 + ' years old'}}</p>
		<!-- blah -->
	</div>`
}

define('user-card', userCard);
