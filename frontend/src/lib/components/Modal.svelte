<script>
	let { title, open = $bindable(false), onclose, children, wide = false } = $props();

	/** @type {HTMLDialogElement} */
	let dialog = $state(null);

	$effect(() => {
		if (!dialog) return;
		if (open) {
			dialog.showModal();
		} else {
			if (dialog.open) dialog.close();
		}
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	/** @param {MouseEvent} e */
	function handleBackdrop(e) {
		if (e.target === dialog) handleClose();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclose={handleClose}
	onclick={handleBackdrop}
	class:wide
>
	<div class="modal-content" onclick={(e) => e.stopPropagation()} role="presentation">
		<div class="modal-header">
			<h2>{title}</h2>
			<button class="close-btn" onclick={handleClose} aria-label="Schließen">×</button>
		</div>
		<div class="modal-body">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		border-radius: 0.75rem;
		padding: 0;
		max-width: 560px;
		width: 90vw;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow:
			0 20px 60px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.06);
	}

	dialog.wide {
		max-width: 760px;
	}

	dialog::backdrop {
		background: rgba(15, 23, 42, 0.55);
		backdrop-filter: blur(2px);
	}

	.modal-content {
		padding: 1.5rem;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
		padding-bottom: 0.875rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1e293b;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #94a3b8;
		line-height: 1;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		transition: color 0.15s, background 0.15s;
	}
	.close-btn:hover {
		color: #1e293b;
		background: #f1f5f9;
	}
</style>
