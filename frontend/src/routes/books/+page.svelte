<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	let books = $state([]);
	let genres = $state([]);
	let authors = $state([]);
	let conditions = $state([]);
	let copies = $state([]);
	let loading = $state(true);

	let filterGenre = $state('');
	let filterAuthor = $state('');
	let search = $state('');
	let sortCol = $state('title');
	let sortDir = $state('asc');

	let expandedId = $state(null);

	let showAdd = $state(false);
	let showEdit = $state(false);
	let showCopy = $state(false);

	let form = $state({ title: '', isbn: '', genre_id: '', author_names: '' });
	let editTarget = $state(null);
	let copyForm = $state({ book_id: '', max_rental_days: 14, rent_per_day: '', condition_id: '', condition_description: '' });

	let filtered = $derived.by(() => {
		let list = books.filter((b) => {
			const q = search.toLowerCase();
			if (q && !b.title?.toLowerCase().includes(q) && !b.isbn?.toLowerCase().includes(q)) return false;
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

	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (filterAuthor) params.set('authorName', filterAuthor);
			const qs = params.size ? '?' + params : '';

			const [booksRes, genresRes, authorsRes, conditionsRes, copiesRes] = await Promise.all([
				api.get('/books' + qs),
				api.get('/genres'),
				api.get('/authors'),
				api.get('/book-conditions'),
				api.get('/book-copies')
			]);
			books = booksRes.data ?? [];
			genres = genresRes;
			authors = authorsRes;
			conditions = conditionsRes;
			copies = copiesRes;
		} finally {
			loading = false;
		}
	}

	async function applyAuthorFilter() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (filterAuthor) params.set('authorName', filterAuthor);
			const res = await api.get('/books' + (params.size ? '?' + params : ''));
			books = res.data ?? [];
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
	function sortIcon(col) {
		if (sortCol !== col) return '↕';
		return sortDir === 'asc' ? '↑' : '↓';
	}

	function openAdd() {
		form = { title: '', isbn: '', genre_id: '', author_names: '' };
		showAdd = true;
	}

	async function saveBook() {
		if (!form.title.trim()) return addToast('Titel ist erforderlich', 'warning');
		try {
			const author_names = form.author_names.trim()
				? form.author_names.split(',').map((s) => s.trim()).filter(Boolean)
				: [];
			await api.post('/books', {
				title: form.title.trim(),
				isbn: form.isbn.trim() || undefined,
				genre_id: form.genre_id || undefined,
				author_names
			});
			addToast('Buch hinzugefügt', 'success');
			showAdd = false;
			books = (await api.get('/books')).data ?? [];
		} catch { /* handled by api */ }
	}

	/** @param {any} book */
	function openEdit(book) {
		editTarget = book;
		form = { title: book.title ?? '', isbn: book.isbn ?? '', genre_id: book.genre_id ?? '', author_names: book.authors ?? '' };
		showEdit = true;
	}

	async function updateBook() {
		if (!form.title.trim()) return addToast('Titel ist erforderlich', 'warning');
		try {
			await api.put('/books/' + editTarget.book_id, {
				title: form.title.trim(),
				isbn: form.isbn.trim() || undefined,
				genre_id: form.genre_id || undefined
			});
			addToast('Buch aktualisiert', 'success');
			showEdit = false;
			books = (await api.get('/books')).data ?? [];
		} catch { /* handled */ }
	}

	/** @param {any} book */
	async function deleteBook(book) {
		if (!confirm(`"${book.title}" löschen? Alle Exemplare werden ebenfalls entfernt.`)) return;
		try {
			await api.del('/books/' + book.book_id);
			addToast('Buch gelöscht', 'success');
			if (expandedId === book.book_id) expandedId = null;
			[books, copies] = [(await api.get('/books')).data ?? [], await api.get('/book-copies')];
		} catch { /* handled */ }
	}

	/** @param {any} book */
	function openAddCopy(book) {
		copyForm = { book_id: book.book_id, max_rental_days: 14, rent_per_day: '', condition_id: '', condition_description: '' };
		showCopy = true;
	}

	async function saveCopy() {
		if (!copyForm.condition_id) return addToast('Zustand ist erforderlich', 'warning');
		if (!copyForm.rent_per_day) return addToast('Preis pro Tag ist erforderlich', 'warning');
		try {
			await api.post('/books/' + copyForm.book_id + '/copies', {
				max_rental_days: Number(copyForm.max_rental_days),
				rent_per_day: Number(copyForm.rent_per_day),
				condition_id: copyForm.condition_id,
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
			await api.del('/book-copies/' + copy.book_copy_id);
			addToast('Exemplar gelöscht', 'success');
			copies = await api.get('/book-copies');
		} catch { /* handled */ }
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

<div class="filters">
	<input type="search" placeholder="Titel oder ISBN suchen…" bind:value={search} />
	<select bind:value={filterGenre}>
		<option value="">Alle Genres</option>
		{#each genres as g}
			<option value={g.genre_id}>{g.genre_name}</option>
		{/each}
	</select>
	<select bind:value={filterAuthor} onchange={applyAuthorFilter}>
		<option value="">Alle Autoren</option>
		{#each authors as a}
			<option value={a.author_name}>{a.author_name}</option>
		{/each}
	</select>
</div>

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
						<th>Autoren</th>
						<th>Exemplare</th>
						<th>Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as book (book.book_id)}
						<tr>
							<td><strong>{book.title}</strong></td>
							<td class="mono">{book.isbn ?? '—'}</td>
							<td>
								{#if book.genre_name}
									<span class="badge badge-blue">{book.genre_name}</span>
								{:else}
									—
								{/if}
							</td>
							<td class="authors-cell">{book.authors ?? '—'}</td>
							<td>
								<button
									class="btn btn-ghost btn-sm copies-btn"
									class:copies-expanded={expandedId === book.book_id}
									onclick={() => (expandedId = expandedId === book.book_id ? null : book.book_id)}
								>
									{bookCopies(book.book_id).length} {bookCopies(book.book_id).length === 1 ? 'Exemplar' : 'Exemplare'}
									<span class="chevron">{expandedId === book.book_id ? '▲' : '▼'}</span>
								</button>
							</td>
							<td>
								<div class="td-actions">
									<button class="btn btn-secondary btn-sm" onclick={() => openEdit(book)}>Bearbeiten</button>
									<button class="btn btn-danger btn-sm" onclick={() => deleteBook(book)}>Löschen</button>
								</div>
							</td>
						</tr>

						{#if expandedId === book.book_id}
							<tr class="sub-table-row">
								<td colspan="6">
									<div class="copies-header">
										<strong>Exemplare von "{book.title}"</strong>
										<button class="btn btn-primary btn-sm" onclick={() => openAddCopy(book)}>
											+ Exemplar hinzufügen
										</button>
									</div>
									{#if bookCopies(book.book_id).length === 0}
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
													{#each bookCopies(book.book_id) as copy (copy.book_copy_id)}
														<tr>
															<td>
																<span class="badge badge-neutral">{copy.book_condition_name ?? '—'}</span>
															</td>
															<td>{copy.condition_description ?? '—'}</td>
															<td>{copy.max_rental_days ?? '—'} Tage</td>
															<td>€{Number(copy.rent_per_day ?? 0).toFixed(2)}/Tag</td>
															<td>
																<button class="btn btn-danger btn-xs" onclick={() => deleteCopy(copy)}>Löschen</button>
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
				<option value={g.genre_id}>{g.genre_name}</option>
			{/each}
		</select>
	</div>
	<div class="form-group">
		<label for="book-authors">Autoren (kommagetrennt)</label>
		<input id="book-authors" bind:value={form.author_names} placeholder="Max Mustermann, Jane Doe" />
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
				<option value={g.genre_id}>{g.genre_name}</option>
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
		<select id="copy-condition" bind:value={copyForm.condition_id}>
			<option value="">— Zustand wählen —</option>
			{#each conditions as c}
				<option value={c.book_condition_id}>{c.book_condition_name}</option>
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
			<input id="copy-rate" type="number" min="0.01" step="0.01" bind:value={copyForm.rent_per_day} placeholder="0.50" />
		</div>
	</div>
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showCopy = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveCopy}>Exemplar hinzufügen</button>
	</div>
</Modal>

<style>
	.mono { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.8125rem; }
	.authors-cell { font-size: 0.8125rem; color: var(--text-muted); max-width: 200px; }

	.copies-btn { display: inline-flex; align-items: center; gap: 0.375rem; }
	.chevron { font-size: 0.625rem; opacity: 0.6; }

	.copies-header {
		display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;
	}

	.no-copies { color: var(--text-muted); font-size: 0.875rem; margin: 0; }
	.req { color: var(--danger); }
</style>
