<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	// ── Data ──────────────────────────────────────────
	let admonitions = $state([]);
	let rentals = $state([]);
	let types = $state([]);
	let loading = $state(true);

	// ── Sort ──────────────────────────────────────────
	let sortCol = $state('admonition_date');
	let sortDir = $state('desc');

	// ── Modal ─────────────────────────────────────────
	let showAdd = $state(false);
	let form = $state({ admonition_date: today(), rental_id: '', admonition_type_id: '' });

	function today() {
		return new Date().toISOString().slice(0, 10);
	}

	// ── Derived ───────────────────────────────────────
	let sorted = $derived.by(() => {
		return [...admonitions].sort((a, b) => {
			let av = (a[sortCol] ?? '').toString();
			let bv = (b[sortCol] ?? '').toString();
			if (av < bv) return sortDir === 'asc' ? -1 : 1;
			if (av > bv) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
	});

	// ── Init ──────────────────────────────────────────
	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			[admonitions, rentals, types] = await Promise.all([
				api.get('/admonitions'),
				api.get('/rentals'),
				api.get('/admonition-types')
			]);
		} finally {
			loading = false;
		}
	}

	// ── Sort ──────────────────────────────────────────
	/** @param {string} col */
	function setSort(col) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortCol = col; sortDir = 'asc'; }
	}

	/** @param {string} col */
	function si(col) {
		return sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
	}

	// ── Add Admonition ────────────────────────────────
	function openAdd() {
		form = { admonition_date: today(), rental_id: '', admonition_type_id: '' };
		showAdd = true;
	}

	async function saveAdmonition() {
		if (!form.rental_id) return addToast('Ausleihe ist erforderlich', 'warning');
		if (!form.admonition_type_id) return addToast('Mahnungstyp ist erforderlich', 'warning');
		try {
			await api.post('/admonitions', {
				admonition_date: form.admonition_date,
				rental_id: form.rental_id,
				admonition_type_id: form.admonition_type_id
			});
			addToast('Mahnung erstellt', 'success');
			showAdd = false;
			admonitions = await api.get('/admonitions');
		} catch { /* handled */ }
	}

	// ── Helpers ───────────────────────────────────────
	/** @param {any} typeId */
	function typeName(typeId) {
		return types.find((t) => String(t.id) === String(typeId))?.admonition_type_name ?? '—';
	}

	/** @param {any} typeId */
	function typeAmount(typeId) {
		const t = types.find((t) => String(t.id) === String(typeId));
		return t ? `€${Number(t.amount).toFixed(2)}` : '—';
	}

	/** @param {any} rentalId */
	function rentalLabel(rentalId) {
		const r = rentals.find((r) => String(r.rental_id ?? r.id) === String(rentalId));
		if (!r) return `Ausleihe #${rentalId}`;
		return `#${rentalId} — ${r.customer_name ?? ''} / ${r.book_title ?? ''}`.trim();
	}

	/** @param {string} dateStr */
	function fmtDate(dateStr) {
		return dateStr ? dateStr.slice(0, 10) : '—';
	}
</script>

<svelte:head><title>Mahnungen — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Mahnungen</h1>
	<button class="btn btn-primary" onclick={openAdd}>+ Neue Mahnung</button>
</div>

<div class="card">
	{#if loading}
		<div class="loading-state"><div class="spinner"></div> Mahnungen werden geladen…</div>
	{:else if sorted.length === 0}
		<div class="empty-state">Noch keine Mahnungen erfasst.</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="sortable" onclick={() => setSort('admonition_date')}>Datum {si('admonition_date')}</th>
						<th>Ausleihe</th>
						<th>Typ</th>
						<th>Betrag</th>
					</tr>
				</thead>
				<tbody>
					{#each sorted as a (a.admonition_id ?? a.id)}
						<tr>
							<td>{fmtDate(a.admonition_date)}</td>
							<td class="rental-cell">
								{#if a.customer_name || a.book_title}
									<span>{a.customer_name ?? ''}</span>
									{#if a.book_title}
										<span class="book-chip">{a.book_title}</span>
									{/if}
								{:else}
									{rentalLabel(a.rental_id)}
								{/if}
							</td>
							<td>
								{#if a.admonition_type_name}
									<span class="badge badge-warning">{a.admonition_type_name}</span>
								{:else}
									<span class="badge badge-warning">{typeName(a.admonition_type_id)}</span>
								{/if}
							</td>
							<td class="amount">
								{#if a.amount}
									€{Number(a.amount).toFixed(2)}
								{:else}
									{typeAmount(a.admonition_type_id)}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- New Admonition Modal -->
<Modal title="Neue Mahnung" bind:open={showAdd}>
	<div class="form-group">
		<label for="adm-date">Datum</label>
		<input id="adm-date" type="date" bind:value={form.admonition_date} />
	</div>
	<div class="form-group">
		<label for="adm-rental">Ausleihe <span class="req">*</span></label>
		<select id="adm-rental" bind:value={form.rental_id}>
			<option value="">— Ausleihe wählen —</option>
			{#each rentals as r}
				<option value={r.rental_id ?? r.id}>
					#{r.rental_id ?? r.id} — {r.customer_name ?? ''} / {r.book_title ?? ''}
				</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="adm-type">Mahnungstyp <span class="req">*</span></label>
		<select id="adm-type" bind:value={form.admonition_type_id}>
			<option value="">— Typ wählen —</option>
			{#each types as t}
				<option value={t.id}>{t.admonition_type_name} (€{Number(t.amount ?? 0).toFixed(2)})</option>
			{/each}
		</select>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showAdd = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveAdmonition}>Mahnung erstellen</button>
	</div>
</Modal>

<style>
	.rental-cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		font-size: 0.875rem;
	}

	.book-chip {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.amount {
		font-weight: 600;
		color: var(--warning-h);
	}

	.req {
		color: var(--danger);
	}
</style>
