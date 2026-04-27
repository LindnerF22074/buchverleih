import { browser } from '$app/environment';

let auth = $state({
	token: browser ? localStorage.getItem('token') : null,
	employee: browser ? JSON.parse(localStorage.getItem('employee') || 'null') : null
});

export function login(tok, emp) {
	auth.token = tok;
	auth.employee = emp;
	if (browser) {
		localStorage.setItem('token', tok);
		localStorage.setItem('employee', JSON.stringify(emp));
	}
}

export function logout() {
	auth.token = null;
	auth.employee = null;
	if (browser) {
		localStorage.removeItem('token');
		localStorage.removeItem('employee');
	}
}

export { auth };
