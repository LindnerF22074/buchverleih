let toasts = $state([]);
let _nextId = 0;

/**
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} [type]
 * @param {number} [duration]
 */
export function addToast(message, type = 'info', duration = 4000) {
	const id = ++_nextId;
	toasts.push({ id, message, type });
	if (duration > 0) {
		setTimeout(() => removeToast(id), duration);
	}
	return id;
}

/** @param {number} id */
export function removeToast(id) {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx !== -1) toasts.splice(idx, 1);
}

export { toasts };
