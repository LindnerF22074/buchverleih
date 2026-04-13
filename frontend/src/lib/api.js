import { addToast } from './toast.svelte.js';

const BASE = '/api';

/**
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function request(method, path, body) {
	try {
		/** @type {RequestInit} */
		const opts = { method };
		if (body !== undefined) {
			opts.headers = { 'Content-Type': 'application/json' };
			opts.body = JSON.stringify(body);
		}

		const res = await fetch(BASE + path, opts);

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
