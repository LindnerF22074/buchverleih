<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';

	let loading = $state(true);
	let stats = $state({ books: 0, customers: 0, active: 0, overdue: 0 });
	let recentRentals = $state([]);

	onMount(async () => {
		try {
			const [books, customers, rentals, returns] = await Promise.all([
				api.get('/books'),
				api.get('/customers'),
				api.get('/rentals'),
				api.get('/book-returns')
			]);

			const returnedIds = new Set(returns.map((r) => r.rental_id));
			const today = new Date().toISOString().slice(0, 10);

			const active = rentals.filter((r) => !returnedIds.has(r.rental_id ?? r.id));
			const overdue = active.filter((r) => {
				const req = (r.required_date ?? '').slice(0, 10);
				return req && req < today;
			});

			stats = {
				books: books.length,
				customers: customers.length,
				active: active.length,
				overdue: overdue.length
			};

			recentRentals = [...rentals].reverse().slice(0, 8);
		} finally {
			loading = false;
		}
	});

	/** @param {string} dateStr */
	function fmtDate(dateStr) {
		if (!dateStr) return '—';
		return dateStr.slice(0, 10);
	}

	/** @param {any} r */
	function rentalStatus(r) {
		return r.returned ? 'returned' : 'active';
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

	<div class="card" style="margin-top: 2rem;">
		<div class="card-body" style="padding-bottom: 0;">
			<h3 class="section-heading">Letzte Ausleihen</h3>
		</div>
		{#if recentRentals.length === 0}
			<div class="empty-state">Noch keine Ausleihen erfasst.</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Buch</th>
							<th>Kunde</th>
							<th>Mitarbeiter</th>
							<th>Ausleihdatum</th>
							<th>Fälligkeitsdatum</th>
						</tr>
					</thead>
					<tbody>
						{#each recentRentals as r}
							<tr>
								<td>{r.book_title ?? r.title ?? '—'}</td>
								<td>{r.customer_name ?? '—'}</td>
								<td>{r.employee_name ?? '—'}</td>
								<td>{fmtDate(r.rental_date)}</td>
								<td>{fmtDate(r.required_date)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}

<style>
	.date-chip {
		font-size: 0.875rem;
		color: var(--text-muted);
	}

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
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.06),
			0 1px 2px rgba(0, 0, 0, 0.04);
		text-decoration: none;
		color: var(--text);
		transition:
			box-shadow 0.2s,
			transform 0.15s;
	}

	.stat-card:hover {
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.stat-card.danger {
		border-left: 3px solid var(--danger);
	}

	.stat-icon {
		font-size: 1.375rem;
		width: 3rem;
		height: 3rem;
		border-radius: 0.625rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.stat-icon.blue {
		background: #dbeafe;
	}
	.stat-icon.green {
		background: #dcfce7;
	}
	.stat-icon.amber {
		background: #fef3c7;
	}
	.stat-icon.red {
		background: #fee2e2;
	}

	.stat-num {
		font-size: 1.875rem;
		font-weight: 700;
		line-height: 1;
		color: var(--text);
	}

	.stat-num.overdue-num {
		color: var(--danger);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.section-heading {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}
</style>
