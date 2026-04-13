<script>
	import { toasts, removeToast } from '../toast.svelte.js';
</script>

<div class="toast-container" aria-live="polite">
	{#each toasts as toast (toast.id)}
		<div class="toast toast-{toast.type}" role="alert">
			<span class="toast-msg">{toast.message}</span>
			<button class="toast-close" onclick={() => removeToast(toast.id)} aria-label="Schließen">×</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
		max-width: 400px;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
		animation: slide-in 0.2s ease;
		color: #fff;
		font-size: 0.875rem;
		line-height: 1.4;
		pointer-events: all;
	}

	.toast-info {
		background: #2563eb;
	}
	.toast-success {
		background: #16a34a;
	}
	.toast-error {
		background: #dc2626;
	}
	.toast-warning {
		background: #d97706;
	}

	.toast-msg {
		flex: 1;
	}

	.toast-close {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 1.25rem;
		line-height: 1;
		padding: 0;
		opacity: 0.8;
		flex-shrink: 0;
		margin-top: -0.1rem;
	}
	.toast-close:hover {
		opacity: 1;
	}

	@keyframes slide-in {
		from {
			transform: translateX(110%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
