<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	let admonitions = $state([]);
	let bookReturns = $state([]);
	let types = $state([]);
	let loading = $state(true);

	let sortCol = $state('admonition_date');
	let sortDir = $state('desc');

	let showAdd = $state(false);
	let form = $state({ book_return_id: '', admonition_type_id: '' });

	let sorted = $derived.by(() => {
		return [...admonitions].sort((a, b) => {
			let av = (a[sortCol] ?? '').toString();
			let bv = (b[sortCol] ?? '').toString();
			if (av < bv) return sortDir === 'asc' ? -1 : 1;
			if (av > bv) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
	});

	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			[admonitions, bookReturns, types] = await Promise.all([
				api.get('/admonitions'),
				api.get('/book-returns'),
				api.get('/admonition-types')
			]);
		} finally {
			loading = false;
		}
	}

	/** @param {string} col */
	function setSort(col) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortCol = col; sortDir = 'asc'; }
	}

	/** @param {string} col */
	function si(col) { return sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'; }

	function openAdd() {
		form = { book_return_id: '', admonition_type_id: '' };
		showAdd = true;
	}

	async function saveAdmonition() {
		if (!form.book_return_id) return addToast('Rückgabe ist erforderlich', 'warning');
		if (!form.admonition_type_id) return addToast('Mahnungstyp ist erforderlich', 'warning');
		try {
			await api.post('/admonitions', {
				book_return_id: form.book_return_id,
				admonition_type_id: form.admonition_type_id
			});
			addToast('Mahnung erstellt', 'success');
			showAdd = false;
			admonitions = await api.get('/admonitions');
		} catch { /* handled */ }
	}

	/** @param {string} d */
	function fmt(d) { return d ? d.slice(0, 10) : '—'; }

	/** @param {any} br */
	function returnLabel(br) {
		return `#${br.book_return_id} — ${br.customer_name ?? ''} / ${br.book_title ?? ''}`.trim();
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
						<th class="sortable" onclick={() => setSort('customer_name')}>Kunde {si('customer_name')}</th>
						<th>Buch</th>
						<th>Typ</th>
						<th>Betrag</th>
					</tr>
				</thead>
				<tbody>
					{#each sorted as a (a.admonition_id)}
						<tr>
							<td>{fmt(a.admonition_date)}</td>
							<td>{a.customer_name ?? '—'}</td>
							<td class="book-cell">{a.book_title ?? '—'}</td>
							<td>
								<span class="badge badge-warning">{a.admonition_type_name ?? '—'}</span>
							</td>
							<td class="amount">
								{a.amount != null ? `€${Number(a.amount).toFixed(2)}` : '—'}
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
		<label for="adm-return">Buchretoure <span class="req">*</span></label>
		<select id="adm-return" bind:value={form.book_return_id}>
			<option value="">— Rückgabe wählen —</option>
			{#each bookReturns as br}
				<option value={br.book_return_id}>{returnLabel(br)}</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="adm-type">Mahnungstyp <span class="req">*</span></label>
		<select id="adm-type" bind:value={form.admonition_type_id}>
			<option value="">— Typ wählen —</option>
			{#each types as t}
				<option value={t.admonition_type_id}>{t.admonition_type_name} (€{Number(t.amount ?? 0).toFixed(2)})</option>
			{/each}
		</select>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showAdd = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveAdmonition}>Mahnung erstellen</button>
	</div>
</Modal>

<style>
	.book-cell { font-size: 0.875rem; color: var(--text-muted); }
	.amount { font-weight: 600; color: var(--warning-h, #b45309); }
	.req { color: var(--danger); }
</style>
