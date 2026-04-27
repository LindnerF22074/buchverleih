<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	let rentals = $state([]);
	let returns = $state([]);
	let customers = $state([]);
	let employees = $state([]);
	let copies = $state([]);
	let books = $state([]);
	let loading = $state(true);

	let filter = $state('all');
	let search = $state('');
	let sortCol = $state('rental_date');
	let sortDir = $state('desc');

	let showNew = $state(false);
	let showReturn = $state(false);
	let showDetail = $state(false);
	let detailRental = $state(null);

	let newForm = $state({ customer_id: '', employee_id: '', book_copy_id: '' });
	let returnForm = $state({ rental_id: '', employee_id: '' });

	function today() { return new Date().toISOString().slice(0, 10); }

	let returnedIds = $derived(new Set(returns.map((r) => r.rental_id)));

	let filtered = $derived.by(() => {
		const t = today();
		let list = rentals.filter((r) => {
			const isReturned = returnedIds.has(r.rental_id);
			const dueDate = (r.required_date ?? '').slice(0, 10);
			const isOverdue = !isReturned && dueDate && dueDate < t;

			if (filter === 'returned' && !isReturned) return false;
			if (filter === 'active' && (isReturned || isOverdue)) return false;
			if (filter === 'overdue' && !isOverdue) return false;

			if (search) {
				const q = search.toLowerCase();
				if (
					!r.book_title?.toLowerCase().includes(q) &&
					!r.customer_name?.toLowerCase().includes(q) &&
					!r.employee_name?.toLowerCase().includes(q)
				) return false;
			}
			return true;
		});

		list.sort((a, b) => {
			let av = (a[sortCol] ?? '').toString();
			let bv = (b[sortCol] ?? '').toString();
			if (av < bv) return sortDir === 'asc' ? -1 : 1;
			if (av > bv) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
		return list;
	});

	let availableCopies = $derived.by(() => {
		const activeRentalCopyIds = new Set(
			rentals
				.filter((r) => !returnedIds.has(r.rental_id))
				.map((r) => r.book_copy_id)
		);
		return copies.filter((c) => !activeRentalCopyIds.has(c.book_copy_id));
	});

	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			const [r, ret, cRes, e, cp, bRes] = await Promise.all([
				api.get('/rentals'),
				api.get('/book-returns'),
				api.get('/customers'),
				api.get('/employees'),
				api.get('/book-copies'),
				api.get('/books')
			]);
			rentals = r;
			returns = ret;
			customers = cRes.data ?? [];
			employees = e;
			copies = cp;
			books = bRes.data ?? [];
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

	function openNew() {
		newForm = { customer_id: '', employee_id: '', book_copy_id: '' };
		showNew = true;
	}

	async function saveRental() {
		if (!newForm.customer_id) return addToast('Kunde ist erforderlich', 'warning');
		if (!newForm.employee_id) return addToast('Mitarbeiter ist erforderlich', 'warning');
		if (!newForm.book_copy_id) return addToast('Buchexemplar ist erforderlich', 'warning');
		try {
			await api.post('/rentals', {
				customer_id: newForm.customer_id,
				employee_id: newForm.employee_id,
				book_copy_id: newForm.book_copy_id
			});
			addToast('Ausleihe erstellt', 'success');
			showNew = false;
			[rentals, returns] = await Promise.all([api.get('/rentals'), api.get('/book-returns')]);
		} catch { /* handled */ }
	}

	/** @param {any} rental */
	function openReturn(rental) {
		returnForm = { rental_id: rental.rental_id, employee_id: '' };
		showReturn = true;
	}

	async function saveReturn() {
		if (!returnForm.employee_id) return addToast('Mitarbeiter ist erforderlich', 'warning');
		try {
			const result = await api.post('/rentals/' + returnForm.rental_id + '/return', {
				employee_id: returnForm.employee_id
			});
			if (result?.admonition) {
				addToast(`Buch zurückgegeben — Mahnung ${result.admonition.admonition_type_name} (${result.admonition.late_days} Tage Verzug)`, 'warning');
			} else {
				addToast('Buch erfolgreich zurückgegeben', 'success');
			}
			showReturn = false;
			[rentals, returns] = await Promise.all([api.get('/rentals'), api.get('/book-returns')]);
		} catch { /* handled */ }
	}

	/** @param {any} rental */
	function openDetail(rental) {
		const ret = returns.find((r) => r.rental_id === rental.rental_id);
		detailRental = { ...rental, bookReturn: ret ?? null };
		showDetail = true;
	}

	/** @param {any} rental */
	async function deleteRental(rental) {
		if (!confirm('Diesen Ausleih-Datensatz löschen?')) return;
		try {
			await api.del('/rentals/' + rental.rental_id);
			addToast('Ausleihe gelöscht', 'success');
			rentals = await api.get('/rentals');
		} catch { /* handled */ }
	}

	/** @param {any} rental */
	function rentalStatus(rental) {
		if (returnedIds.has(rental.rental_id)) return 'returned';
		const due = (rental.required_date ?? '').slice(0, 10);
		if (due && due < today()) return 'overdue';
		return 'active';
	}

	/** @param {string} d */
	function fmt(d) { return d ? d.slice(0, 10) : '—'; }

	/** @param {any} copyId */
	function copyLabel(copyId) {
		const copy = copies.find((c) => String(c.book_copy_id) === String(copyId));
		if (!copy) return `Exemplar #${copyId}`;
		const book = books.find((b) => String(b.book_id) === String(copy.book_id));
		return book ? `${book.title} (Ex. #${copy.book_copy_id})` : `Ex. #${copy.book_copy_id}`;
	}
</script>

<svelte:head><title>Ausleihen — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Ausleihen</h1>
	<button class="btn btn-primary" onclick={openNew}>+ Neue Ausleihe</button>
</div>

<div class="toolbar">
	<div class="filters">
		<input type="search" placeholder="Buch, Kunde, Mitarbeiter suchen…" bind:value={search} />
	</div>
	<div class="filter-tabs">
		{#each [['all','Alle'],['active','Aktiv'],['overdue','Überfällig'],['returned','Zurückgegeben']] as [val, label]}
			<button
				class="filter-pill"
				class:active={filter === val}
				class:overdue-pill={val === 'overdue' && filter === val}
				onclick={() => (filter = val)}
			>{label}</button>
		{/each}
	</div>
</div>

<div class="card">
	{#if loading}
		<div class="loading-state"><div class="spinner"></div> Ausleihen werden geladen…</div>
	{:else if filtered.length === 0}
		<div class="empty-state">Keine Ausleihen gefunden.</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Status</th>
						<th class="sortable" onclick={() => setSort('book_title')}>Buch {si('book_title')}</th>
						<th class="sortable" onclick={() => setSort('customer_name')}>Kunde {si('customer_name')}</th>
						<th class="sortable" onclick={() => setSort('employee_name')}>Mitarbeiter {si('employee_name')}</th>
						<th class="sortable" onclick={() => setSort('rental_date')}>Ausgeliehen {si('rental_date')}</th>
						<th class="sortable" onclick={() => setSort('required_date')}>Fällig {si('required_date')}</th>
						<th>Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as r (r.rental_id)}
						{@const status = rentalStatus(r)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<tr class="clickable row-{status}" onclick={() => openDetail(r)}>
							<td>
								{#if status === 'returned'}
									<span class="badge badge-neutral">Zurückgegeben</span>
								{:else if status === 'overdue'}
									<span class="badge badge-danger">Überfällig</span>
								{:else}
									<span class="badge badge-success">Aktiv</span>
								{/if}
							</td>
							<td>{r.book_title ?? '—'}</td>
							<td>{r.customer_name ?? '—'}</td>
							<td>{r.employee_name ?? '—'}</td>
							<td>{fmt(r.rental_date)}</td>
							<td class:overdue-date={status === 'overdue'}>{fmt(r.required_date)}</td>
							<td>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div class="td-actions" onclick={(e) => e.stopPropagation()}>
									{#if status !== 'returned'}
										<button class="btn btn-success btn-sm" onclick={() => openReturn(r)}>Zurückgeben</button>
									{/if}
									<button class="btn btn-danger btn-sm" onclick={() => deleteRental(r)}>Löschen</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- New Rental Modal -->
<Modal title="Neue Ausleihe" bind:open={showNew}>
	<div class="form-group">
		<label for="r-customer">Kunde <span class="req">*</span></label>
		<select id="r-customer" bind:value={newForm.customer_id}>
			<option value="">— Kunde wählen —</option>
			{#each customers as c}
				<option value={c.customer_id}>{c.customer_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="r-employee">Mitarbeiter <span class="req">*</span></label>
		<select id="r-employee" bind:value={newForm.employee_id}>
			<option value="">— Mitarbeiter wählen —</option>
			{#each employees as e}
				<option value={e.employee_id}>{e.employee_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="r-copy">Buchexemplar <span class="req">*</span></label>
		<select id="r-copy" bind:value={newForm.book_copy_id}>
			<option value="">— Verfügbares Exemplar wählen —</option>
			{#each availableCopies as c}
				<option value={c.book_copy_id}>{copyLabel(c.book_copy_id)}</option>
			{/each}
		</select>
		{#if availableCopies.length === 0}
			<small class="hint">Keine Exemplare verfügbar.</small>
		{/if}
	</div>
	<p class="hint-info">Ausleihdatum und Fälligkeitsdatum werden automatisch gesetzt.</p>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showNew = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveRental}>Ausleihe erstellen</button>
	</div>
</Modal>

<!-- Return Book Modal -->
<Modal title="Buch zurückgeben" bind:open={showReturn}>
	<div class="form-group">
		<label>Ausleihe-Nr.</label>
		<input type="text" value={returnForm.rental_id} disabled />
	</div>
	<div class="form-group">
		<label for="ret-employee">Bearbeitet von <span class="req">*</span></label>
		<select id="ret-employee" bind:value={returnForm.employee_id}>
			<option value="">— Mitarbeiter wählen —</option>
			{#each employees as e}
				<option value={e.employee_id}>{e.employee_name}</option>
			{/each}
		</select>
	</div>
	<p class="hint-info">Mietbetrag wird automatisch berechnet. Bei Überschreitung wird eine Mahnung ausgelöst.</p>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showReturn = false)}>Abbrechen</button>
		<button class="btn btn-success" onclick={saveReturn}>Rückgabe bestätigen</button>
	</div>
</Modal>

<!-- Rental Detail Modal -->
{#if detailRental}
	<Modal title="Ausleihe #{detailRental.rental_id}" bind:open={showDetail}>
		{@const status = rentalStatus(detailRental)}
		<div style="margin-bottom:1rem;">
			{#if status === 'returned'}
				<span class="badge badge-neutral">Zurückgegeben</span>
			{:else if status === 'overdue'}
				<span class="badge badge-danger">Überfällig</span>
			{:else}
				<span class="badge badge-success">Aktiv</span>
			{/if}
		</div>
		<dl class="detail-grid">
			<dt>Buch</dt><dd>{detailRental.book_title ?? '—'}</dd>
			<dt>Kunde</dt><dd>{detailRental.customer_name ?? '—'}</dd>
			<dt>Mitarbeiter</dt><dd>{detailRental.employee_name ?? '—'}</dd>
			<dt>Ausgeliehen</dt><dd>{fmt(detailRental.rental_date)}</dd>
			<dt>Fällig</dt><dd class:danger-text={status === 'overdue'}>{fmt(detailRental.required_date)}</dd>
			{#if detailRental.bookReturn}
				<dt>Zurückgegeben</dt><dd>{fmt(detailRental.bookReturn.return_date)}</dd>
				<dt>Mietbetrag</dt><dd>€{Number(detailRental.bookReturn.rent_amount ?? 0).toFixed(2)}</dd>
			{/if}
		</dl>
		<div class="form-actions">
			<button class="btn btn-secondary" onclick={() => (showDetail = false)}>Schließen</button>
			{#if status !== 'returned'}
				<button class="btn btn-success" onclick={() => { showDetail = false; openReturn(detailRental); }}>
					Zurückgeben
				</button>
			{/if}
		</div>
	</Modal>
{/if}

<style>
	.toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }

	.filter-tabs { display: flex; gap: 0.375rem; flex-wrap: wrap; }

	.filter-pill {
		padding: 0.3125rem 0.875rem;
		border-radius: 9999px;
		border: 1px solid var(--border);
		background: #fff;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s;
		font-family: inherit;
	}

	.filter-pill:hover { background: var(--bg); color: var(--text); }
	.filter-pill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
	.filter-pill.overdue-pill { background: var(--danger); border-color: var(--danger); }

	.clickable { cursor: pointer; }
	.clickable:hover td { background: #f8fafc !important; }

	:global(.row-overdue td) { background: #fff9f9 !important; }
	.overdue-date { color: var(--danger); font-weight: 600; }

	.detail-grid {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 0.5rem 1rem;
		margin: 0 0 1rem;
	}

	dt { font-size: 0.8125rem; color: var(--text-muted); font-weight: 500; align-self: center; }
	dd { margin: 0; font-size: 0.9375rem; }
	.danger-text { color: var(--danger); font-weight: 600; }

	.req { color: var(--danger); }
	.hint { color: var(--text-muted); font-size: 0.75rem; }
	.hint-info { font-size: 0.8125rem; color: var(--text-muted); margin: 0 0 0.75rem; }
</style>
