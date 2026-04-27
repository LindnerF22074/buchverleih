<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import Modal from '$lib/components/Modal.svelte';

	let loading = $state(true);
	let stats = $state({ books: 0, customers: 0, active: 0, overdue: 0 });
	let rentals = $state([]);
	let bookReturns = $state([]);
	let admonitions = $state([]);

	// ── Filters ───────────────────────────────────────
	let filter = $state('all'); // 'all' | 'active' | 'overdue' | 'returned'
	let search = $state('');

	// ── Detail modal ──────────────────────────────────
	let detailRental = $state(null);
	let showDetail = $state(false);

	onMount(async () => {
		try {
			const [booksRes, customersRes, rentalsRaw, returnsRaw, admRaw] = await Promise.all([
				api.get('/books?pageSize=1'),
				api.get('/customers?pageSize=1'),
				api.get('/rentals'),
				api.get('/book-returns'),
				api.get('/admonitions')
			]);

			rentals = rentalsRaw;
			bookReturns = returnsRaw;
			admonitions = admRaw;

			const returnedIds = new Set(returnsRaw.map((r) => r.rental_id));
			const today = new Date().toISOString().slice(0, 10);
			const active = rentalsRaw.filter((r) => !returnedIds.has(r.rental_id));
			const overdue = active.filter((r) => {
				const req = (r.required_date ?? '').slice(0, 10);
				return req && req < today;
			});

			stats = {
				books: booksRes.total ?? 0,
				customers: customersRes.total ?? 0,
				active: active.length,
				overdue: overdue.length
			};
		} finally {
			loading = false;
		}
	});

	// ── Derived ───────────────────────────────────────
	let returnedIds = $derived(new Set(bookReturns.map((r) => r.rental_id)));

	let filtered = $derived.by(() => {
		const today = new Date().toISOString().slice(0, 10);
		return rentals
			.filter((r) => {
				const isReturned = returnedIds.has(r.rental_id);
				const due = (r.required_date ?? '').slice(0, 10);
				const isOverdue = !isReturned && due && due < today;

				if (filter === 'returned' && !isReturned) return false;
				if (filter === 'active' && (isReturned || isOverdue)) return false;
				if (filter === 'overdue' && !isOverdue) return false;

				if (search) {
					const q = search.toLowerCase();
					return (
						r.book_title?.toLowerCase().includes(q) ||
						r.customer_name?.toLowerCase().includes(q) ||
						r.employee_name?.toLowerCase().includes(q)
					);
				}
				return true;
			})
			.sort((a, b) => (b.rental_date ?? '').localeCompare(a.rental_date ?? ''));
	});

	/** @param {any} r */
	function rentalStatus(r) {
		if (returnedIds.has(r.rental_id)) return 'returned';
		const due = (r.required_date ?? '').slice(0, 10);
		const today = new Date().toISOString().slice(0, 10);
		if (due && due < today) return 'overdue';
		return 'active';
	}

	/** @param {any} r */
	function openDetail(r) {
		const ret = bookReturns.find((br) => br.rental_id === r.rental_id);
		const adm = ret ? admonitions.filter((a) => a.book_return_id === ret.book_return_id) : [];
		detailRental = { ...r, bookReturn: ret ?? null, admonitions: adm };
		showDetail = true;
	}

	/** @param {string} d */
	function fmt(d) {
		return d ? d.slice(0, 10) : '—';
	}
</script>

<svelte:head><title>Dashboard — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Dashboard</h1>
	<span class="date-chip">{new Date().toLocaleDateString('de-DE', { dateStyle: 'long' })}</span>
</div>

{#if loading}
	<div class="loading-state"><div class="spinner"></div> Laden…</div>
{:else}
	<div class="stats-grid">
		<a href="/books" class="stat-card">
			<div class="stat-icon blue">📚</div>
			<div>
				<div class="stat-num">{stats.books}</div>
				<div class="stat-label">Bücher gesamt</div>
			</div>
		</a>
		<a href="/customers" class="stat-card">
			<div class="stat-icon green">👥</div>
			<div>
				<div class="stat-num">{stats.customers}</div>
				<div class="stat-label">Kunden</div>
			</div>
		</a>
		<a href="/rentals" class="stat-card">
			<div class="stat-icon amber">📋</div>
			<div>
				<div class="stat-num">{stats.active}</div>
				<div class="stat-label">Aktive Ausleihen</div>
			</div>
		</a>
		<a href="/rentals" class="stat-card" class:danger={stats.overdue > 0}>
			<div class="stat-icon red">⚠️</div>
			<div>
				<div class="stat-num" class:overdue-num={stats.overdue > 0}>{stats.overdue}</div>
				<div class="stat-label">Überfällige Ausleihen</div>
			</div>
		</a>
	</div>

	<!-- Rental list with filters -->
	<div class="card" style="margin-top: 2rem;">
		<div class="list-header">
			<h3 class="section-heading">Ausleihen</h3>
			<div class="list-controls">
				<input
					type="search"
					class="search-inline"
					placeholder="Suchen…"
					bind:value={search}
				/>
				<div class="filter-pills">
					{#each [['all','Alle'],['active','Aktiv'],['overdue','Überfällig'],['returned','Zurückgegeben']] as [val, label]}
						<button
							class="pill"
							class:active={filter === val}
							class:pill-danger={val === 'overdue' && filter === val}
							onclick={() => (filter = val)}
						>{label}</button>
					{/each}
				</div>
			</div>
		</div>

		{#if filtered.length === 0}
			<div class="empty-state">Keine Ausleihen gefunden.</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Status</th>
							<th>Buch</th>
							<th>Kunde</th>
							<th>Ausgeliehen</th>
							<th>Fällig</th>
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
								<td>{fmt(r.rental_date)}</td>
								<td class:overdue-date={status === 'overdue'}>{fmt(r.required_date)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}

<!-- Rental Detail Modal -->
{#if detailRental}
	<Modal title="Ausleihe #{detailRental.rental_id}" bind:open={showDetail}>
		{@const status = rentalStatus(detailRental)}
		<div class="detail-status">
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
		{#if detailRental.admonitions?.length}
			<div class="detail-section">
				<h4>Mahnungen</h4>
				{#each detailRental.admonitions as a}
					<div class="adm-row">
						<span class="badge badge-warning">{a.admonition_type_name}</span>
						<span>{fmt(a.admonition_date)}</span>
						<span class="adm-amount">€{Number(a.amount ?? 0).toFixed(2)}</span>
					</div>
				{/each}
			</div>
		{/if}
		<div class="form-actions">
			<button class="btn btn-secondary" onclick={() => (showDetail = false)}>Schließen</button>
			<a href="/rentals" class="btn btn-primary">Zur Ausleihe</a>
		</div>
	</Modal>
{/if}

<style>
	.date-chip { font-size: 0.875rem; color: var(--text-muted); }

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: #fff;
		border-radius: 0.75rem;
		padding: 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
		text-decoration: none;
		color: var(--text);
		transition: box-shadow 0.2s, transform 0.15s;
	}

	.stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); transform: translateY(-1px); }
	.stat-card.danger { border-left: 3px solid var(--danger); }

	.stat-icon {
		font-size: 1.375rem;
		width: 3rem; height: 3rem;
		border-radius: 0.625rem;
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
	}

	.stat-icon.blue  { background: #dbeafe; }
	.stat-icon.green { background: #dcfce7; }
	.stat-icon.amber { background: #fef3c7; }
	.stat-icon.red   { background: #fee2e2; }

	.stat-num { font-size: 1.875rem; font-weight: 700; line-height: 1; color: var(--text); }
	.stat-num.overdue-num { color: var(--danger); }
	.stat-label { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem; }

	.list-header {
		padding: 1rem 1.25rem 0.75rem;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.section-heading { font-size: 1rem; font-weight: 600; margin: 0; }

	.list-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

	.search-inline {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		width: 180px;
		font-family: inherit;
		background: #fff;
	}

	.filter-pills { display: flex; gap: 0.375rem; flex-wrap: wrap; }

	.pill {
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

	.pill:hover { background: var(--bg); color: var(--text); }
	.pill.active { background: var(--primary); color: #fff; border-color: var(--primary); }
	.pill.pill-danger { background: var(--danger); border-color: var(--danger); }

	.clickable { cursor: pointer; }
	.clickable:hover td { background: #f8fafc !important; }

	:global(.row-overdue td) { background: #fff9f9 !important; }
	.overdue-date { color: var(--danger); font-weight: 600; }

	/* Detail modal */
	.detail-status { margin-bottom: 1rem; }

	.detail-grid {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 0.5rem 1rem;
		margin: 0 0 1rem;
	}

	dt { font-size: 0.8125rem; color: var(--text-muted); font-weight: 500; align-self: center; }
	dd { margin: 0; font-size: 0.9375rem; }
	.danger-text { color: var(--danger); font-weight: 600; }

	.detail-section { margin-bottom: 1rem; }
	.detail-section h4 { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.5rem; }

	.adm-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.375rem 0;
		font-size: 0.875rem;
		border-bottom: 1px solid var(--border);
	}

	.adm-amount { margin-left: auto; font-weight: 600; color: var(--warning-h, #b45309); }
</style>
