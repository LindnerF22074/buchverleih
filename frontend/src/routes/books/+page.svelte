<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	// ── Data ──────────────────────────────────────────
	let books = $state([]);
	let genres = $state([]);
	let authors = $state([]);
	let conditions = $state([]);
	let copies = $state([]);
	let loading = $state(true);

	// ── Filters & Sort ────────────────────────────────
	let filterGenre = $state('');
	let filterAuthor = $state('');
	let search = $state('');
	let sortCol = $state('title');
	let sortDir = $state('asc');

	// ── Expanded row ──────────────────────────────────
	let expandedId = $state(null);

	// ── Modals ────────────────────────────────────────
	let showAdd = $state(false);
	let showEdit = $state(false);
	let showCopy = $state(false);

	// ── Forms ─────────────────────────────────────────
	let form = $state({ title: '', isbn: '', genre_id: '' });
	let editTarget = $state(null);
	let copyForm = $state({
		book_id: '',
		max_rental_days: 14,
		rent_per_day: '',
		book_condition_id: '',
		condition_description: ''
	});

	// ── Derived ───────────────────────────────────────
	let filtered = $derived.by(() => {
		let list = books.filter((b) => {
			const q = search.toLowerCase();
			if (q && !b.title?.toLowerCase().includes(q) && !b.isbn?.toLowerCase().includes(q))
				return false;
			if (filterGenre && String(b.genre_id) !== String(filterGenre)) return false;
			return true;
		});
		list.sort((a, b) => {
			let av = (a[sortCol] ?? '').toString().toLowerCase();
			let bv = (b[sortCol] ?? '').toString().toLowerCase();
			if (av < bv) return sortDir === 'asc' ? -1 : 1;
			if (av > bv) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
		return list;
	});

	// ── Init ──────────────────────────────────────────
	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (filterAuthor) params.set('author', filterAuthor);
			const qs = params.size ? '?' + params : '';

			[books, genres, authors, conditions, copies] = await Promise.all([
				api.get('/books' + qs),
				api.get('/genres'),
				api.get('/authors'),
				api.get('/book-conditions'),
				api.get('/book-copies')
			]);
		} finally {
			loading = false;
		}
	}

	async function applyAuthorFilter() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (filterAuthor) params.set('author', filterAuthor);
			books = await api.get('/books' + (params.size ? '?' + params : ''));
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
	function sortIcon(col) {
		if (sortCol !== col) return '↕';
		return sortDir === 'asc' ? '↑' : '↓';
	}

	// ── Add Book ──────────────────────────────────────
	function openAdd() {
		form = { title: '', isbn: '', genre_id: '' };
		showAdd = true;
	}

	async function saveBook() {
		if (!form.title.trim()) return addToast('Titel ist erforderlich', 'warning');
		try {
			await api.post('/books', {
				title: form.title.trim(),
				isbn: form.isbn.trim() || undefined,
				genre_id: form.genre_id || undefined
			});
			addToast('Buch hinzugefügt', 'success');
			showAdd = false;
			books = await api.get('/books');
		} catch { /* handled by api */ }
	}

	// ── Edit Book ─────────────────────────────────────
	/** @param {any} book */
	function openEdit(book) {
		editTarget = book;
		form = { title: book.title ?? '', isbn: book.isbn ?? '', genre_id: book.genre_id ?? '' };
		showEdit = true;
	}

	async function updateBook() {
		if (!form.title.trim()) return addToast('Titel ist erforderlich', 'warning');
		try {
			await api.put('/books/' + editTarget.id, {
				title: form.title.trim(),
				isbn: form.isbn.trim() || undefined,
				genre_id: form.genre_id || undefined
			});
			addToast('Buch aktualisiert', 'success');
			showEdit = false;
			books = await api.get('/books');
		} catch { /* handled */ }
	}

	// ── Delete Book ───────────────────────────────────
	/** @param {any} book */
	async function deleteBook(book) {
		if (!confirm(`"${book.title}" löschen? Alle Exemplare werden ebenfalls entfernt.`)) return;
		try {
			await api.del('/books/' + book.id);
			addToast('Buch gelöscht', 'success');
			if (expandedId === book.id) expandedId = null;
			books = await api.get('/books');
			copies = await api.get('/book-copies');
		} catch { /* handled */ }
	}

	// ── Book Copies ───────────────────────────────────
	/** @param {any} book */
	function openAddCopy(book) {
		copyForm = {
			book_id: book.id,
			max_rental_days: 14,
			rent_per_day: '',
			book_condition_id: '',
			condition_description: ''
		};
		showCopy = true;
	}

	async function saveCopy() {
		if (!copyForm.book_condition_id) return addToast('Zustand ist erforderlich', 'warning');
		if (!copyForm.rent_per_day) return addToast('Preis pro Tag ist erforderlich', 'warning');
		try {
			await api.post('/book-copies', {
				book_id: copyForm.book_id,
				max_rental_days: Number(copyForm.max_rental_days),
				rent_per_day: Number(copyForm.rent_per_day),
				book_condition_id: copyForm.book_condition_id,
				condition_description: copyForm.condition_description || undefined
			});
			addToast('Exemplar hinzugefügt', 'success');
			showCopy = false;
			copies = await api.get('/book-copies');
		} catch { /* handled */ }
	}

	/** @param {any} copy */
	async function deleteCopy(copy) {
		if (!confirm('Dieses Exemplar löschen?')) return;
		try {
			await api.del('/book-copies/' + copy.id);
			addToast('Exemplar gelöscht', 'success');
			copies = await api.get('/book-copies');
		} catch { /* handled */ }
	}

	// ── Helpers ───────────────────────────────────────
	/** @param {any} id */
	function genreName(id) {
		return genres.find((g) => String(g.id) === String(id))?.genre_name ?? '—';
	}

	/** @param {any} id */
	function conditionName(id) {
		return conditions.find((c) => String(c.id) === String(id))?.book_condition_name ?? '—';
	}

	/** @param {any} bookId */
	function bookCopies(bookId) {
		return copies.filter((c) => String(c.book_id) === String(bookId));
	}
</script>

<svelte:head><title>Bücher — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Bücher</h1>
	<button class="btn btn-primary" onclick={openAdd}>+ Buch hinzufügen</button>
</div>

<!-- Filters -->
<div class="filters">
	<input
		type="search"
		placeholder="Titel oder ISBN suchen…"
		bind:value={search}
	/>
	<select
		bind:value={filterGenre}
	>
		<option value="">Alle Genres</option>
		{#each genres as g}
			<option value={g.id}>{g.genre_name}</option>
		{/each}
	</select>
	<select
		bind:value={filterAuthor}
		onchange={applyAuthorFilter}
	>
		<option value="">Alle Autoren</option>
		{#each authors as a}
			<option value={a.author_name}>{a.author_name}</option>
		{/each}
	</select>
</div>

<!-- Table -->
<div class="card">
	{#if loading}
		<div class="loading-state"><div class="spinner"></div> Bücher werden geladen…</div>
	{:else if filtered.length === 0}
		<div class="empty-state">Keine Bücher gefunden.</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="sortable" onclick={() => setSort('title')}>Titel {sortIcon('title')}</th>
						<th class="sortable" onclick={() => setSort('isbn')}>ISBN {sortIcon('isbn')}</th>
						<th>Genre</th>
						<th>Exemplare</th>
						<th>Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as book (book.id)}
						<tr>
							<td><strong>{book.title}</strong></td>
							<td class="mono">{book.isbn ?? '—'}</td>
							<td>
								{#if book.genre_name}
									<span class="badge badge-blue">{book.genre_name}</span>
								{:else if book.genre_id}
									<span class="badge badge-blue">{genreName(book.genre_id)}</span>
								{:else}
									—
								{/if}
							</td>
							<td>
								<button
									class="btn btn-ghost btn-sm copies-btn"
									class:copies-expanded={expandedId === book.id}
									onclick={() => (expandedId = expandedId === book.id ? null : book.id)}
								>
									{bookCopies(book.id).length} {bookCopies(book.id).length === 1 ? 'Exemplar' : 'Exemplare'}
									<span class="chevron">{expandedId === book.id ? '▲' : '▼'}</span>
								</button>
							</td>
							<td>
								<div class="td-actions">
									<button class="btn btn-secondary btn-sm" onclick={() => openEdit(book)}>Bearbeiten</button>
									<button class="btn btn-danger btn-sm" onclick={() => deleteBook(book)}>Löschen</button>
								</div>
							</td>
						</tr>

						{#if expandedId === book.id}
							<tr class="sub-table-row">
								<td colspan="5">
									<div class="copies-header">
										<strong>Copies of "{book.title}"</strong>
										<button class="btn btn-primary btn-sm" onclick={() => openAddCopy(book)}>
											+ Exemplar hinzufügen
										</button>
									</div>
									{#if bookCopies(book.id).length === 0}
										<p class="no-copies">Noch keine Exemplare erfasst.</p>
									{:else}
										<div class="sub-table">
											<table>
												<thead>
													<tr>
														<th>Zustand</th>
														<th>Beschreibung</th>
														<th>Max. Tage</th>
														<th>Preis/Tag</th>
														<th>Aktionen</th>
													</tr>
												</thead>
												<tbody>
													{#each bookCopies(book.id) as copy (copy.id)}
														<tr>
															<td>
																<span class="badge badge-neutral">
																	{copy.book_condition_name ?? conditionName(copy.book_condition_id)}
																</span>
															</td>
															<td>{copy.condition_description ?? '—'}</td>
															<td>{copy.max_rental_days ?? '—'} Tage</td>
															<td>€{Number(copy.rent_per_day ?? 0).toFixed(2)}/day</td>
															<td>
																<button
																	class="btn btn-danger btn-xs"
																	onclick={() => deleteCopy(copy)}>Löschen</button
																>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{/if}
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Add Book Modal -->
<Modal title="Buch hinzufügen" bind:open={showAdd}>
	<div class="form-group">
		<label for="book-title">Titel <span class="req">*</span></label>
		<input id="book-title" bind:value={form.title} placeholder="Buchtitel" />
	</div>
	<div class="form-group">
		<label for="book-isbn">ISBN</label>
		<input id="book-isbn" bind:value={form.isbn} placeholder="978-3-…" />
	</div>
	<div class="form-group">
		<label for="book-genre">Genre</label>
		<select id="book-genre" bind:value={form.genre_id}>
			<option value="">— Kein Genre —</option>
			{#each genres as g}
				<option value={g.id}>{g.genre_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showAdd = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveBook}>Buch hinzufügen</button>
	</div>
</Modal>

<!-- Edit Book Modal -->
<Modal title="Buch bearbeiten" bind:open={showEdit}>
	<div class="form-group">
		<label for="edit-title">Titel <span class="req">*</span></label>
		<input id="edit-title" bind:value={form.title} />
	</div>
	<div class="form-group">
		<label for="edit-isbn">ISBN</label>
		<input id="edit-isbn" bind:value={form.isbn} />
	</div>
	<div class="form-group">
		<label for="edit-genre">Genre</label>
		<select id="edit-genre" bind:value={form.genre_id}>
			<option value="">— Kein Genre —</option>
			{#each genres as g}
				<option value={g.id}>{g.genre_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showEdit = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={updateBook}>Änderungen speichern</button>
	</div>
</Modal>

<!-- Add Copy Modal -->
<Modal title="Exemplar hinzufügen" bind:open={showCopy}>
	<div class="form-group">
		<label for="copy-condition">Zustand <span class="req">*</span></label>
		<select id="copy-condition" bind:value={copyForm.book_condition_id}>
			<option value="">— Zustand wählen —</option>
			{#each conditions as c}
				<option value={c.id}>{c.book_condition_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="copy-desc">Zustandsbeschreibung</label>
		<input id="copy-desc" bind:value={copyForm.condition_description} placeholder="z.B. Leichte Gebrauchsspuren" />
	</div>
	<div class="form-row">
		<div class="form-group">
			<label for="copy-days">Max. Ausleihtage</label>
			<input id="copy-days" type="number" min="1" bind:value={copyForm.max_rental_days} />
		</div>
		<div class="form-group">
			<label for="copy-rate">Preis pro Tag (€) <span class="req">*</span></label>
			<input id="copy-rate" type="number" min="0" step="0.01" bind:value={copyForm.rent_per_day} placeholder="0.50" />
		</div>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showCopy = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveCopy}>Exemplar hinzufügen</button>
	</div>
</Modal>

<style>
	.mono {
		font-family: 'SFMono-Regular', Consolas, monospace;
		font-size: 0.8125rem;
	}

	.copies-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.chevron {
		font-size: 0.625rem;
		opacity: 0.6;
	}

	.copies-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.no-copies {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.req {
		color: var(--danger);
	}
</style>
