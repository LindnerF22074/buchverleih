import { addToast } from './toast.svelte.js';
import { auth, logout } from './auth.svelte.js';

const BASE = '/api';

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function request(method, path, body) {
	try {
		/** @type {Record<string,string>} */
		const headers = {};
		/** @type {RequestInit} */
		const opts = { method, headers };

		if (body !== undefined) {
			headers['Content-Type'] = 'application/json';
			opts.body = JSON.stringify(body);
		}

		if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

		const res = await fetch(BASE + path, opts);

		if (res.status === 401 && path !== '/auth/login') {
			logout();
			window.location.href = '/login';
			throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
		}

		if (!res.ok) {
			let msg = `HTTP ${res.status}`;
			try {
				const data = await res.json();
				msg = data.message || data.error || msg;
			} catch {
				// ignore json parse errors
			}
			throw new Error(msg);
		}

		if (res.status === 204) return null;
		return res.json();
	} catch (/** @type {any} */ e) {
		addToast(e.message || 'Anfrage fehlgeschlagen', 'error');
		throw e;
	}
}

export const api = {
	/** @param {string} path */
	get: (path) => request('GET', path),
	/** @param {string} path @param {unknown} body */
	post: (path, body) => request('POST', path, body),
	/** @param {string} path @param {unknown} body */
	put: (path, body) => request('PUT', path, body),
	/** @param {string} path */
	del: (path) => request('DELETE', path)
};
