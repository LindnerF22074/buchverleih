<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';

	// ── Tabs ──────────────────────────────────────────
	const TABS = [
		{ id: 'genres', label: 'Genres' },
		{ id: 'authors', label: 'Autoren' },
		{ id: 'conditions', label: 'Buchzustände' },
		{ id: 'adm-types', label: 'Mahnungstypen' },
		{ id: 'employees', label: 'Mitarbeiter' },
		{ id: 'addresses', label: 'Adressen' }
	];
	let activeTab = $state('genres');

	// ── Data ──────────────────────────────────────────
	let genres = $state([]);
	let authors = $state([]);
	let conditions = $state([]);
	let admTypes = $state([]);
	let employees = $state([]);
	let addresses = $state([]);
	let loading = $state(true);

	// ── Add forms ─────────────────────────────────────
	let newGenre = $state('');
	let newAuthor = $state('');
	let newCondition = $state('');
	let newAdmType = $state({ admonition_type_name: '', amount: '' });
	let newEmployee = $state({ employee_name: '', employee_username: '', employee_password: '' });
	let newAddress = $state({ street: '', city: '', zipcode: '' });

	let saving = $state(false);

	// ── Init ──────────────────────────────────────────
	onMount(loadAll);

	async function loadAll() {
		loading = true;
		try {
			[genres, authors, conditions, admTypes, employees, addresses] = await Promise.all([
				api.get('/genres'),
				api.get('/authors'),
				api.get('/book-conditions'),
				api.get('/admonition-types'),
				api.get('/employees'),
				api.get('/addresses')
			]);
		} finally {
			loading = false;
		}
	}

	// ── Generic delete helper ─────────────────────────
	/**
	 * @param {string} endpoint
	 * @param {any} item
	 * @param {string} nameField
	 */
	async function deleteItem(endpoint, item, nameField) {
		const name = item[nameField] ?? `#${item.id}`;
		if (!confirm(`"${name}" löschen?`)) return;
		try {
			await api.del(endpoint + '/' + item.id);
			addToast('Gelöscht', 'success');
			await loadAll();
		} catch { /* handled */ }
	}

	// ── Genres ────────────────────────────────────────
	async function addGenre() {
		if (!newGenre.trim()) return addToast('Genre-Name ist erforderlich', 'warning');
		saving = true;
		try {
			await api.post('/genres', { genre_name: newGenre.trim() });
			addToast('Genre hinzugefügt', 'success');
			newGenre = '';
			genres = await api.get('/genres');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}

	// ── Authors ───────────────────────────────────────
	async function addAuthor() {
		if (!newAuthor.trim()) return addToast('Autorenname ist erforderlich', 'warning');
		saving = true;
		try {
			await api.post('/authors', { author_name: newAuthor.trim() });
			addToast('Autor hinzugefügt', 'success');
			newAuthor = '';
			authors = await api.get('/authors');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}

	// ── Book Conditions ───────────────────────────────
	async function addCondition() {
		if (!newCondition.trim()) return addToast('Zustandsname ist erforderlich', 'warning');
		saving = true;
		try {
			await api.post('/book-conditions', { book_condition_name: newCondition.trim() });
			addToast('Zustand hinzugefügt', 'success');
			newCondition = '';
			conditions = await api.get('/book-conditions');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}

	// ── Admonition Types ──────────────────────────────
	async function addAdmType() {
		if (!newAdmType.admonition_type_name.trim()) return addToast('Typbezeichnung ist erforderlich', 'warning');
		if (!newAdmType.amount) return addToast('Betrag ist erforderlich', 'warning');
		saving = true;
		try {
			await api.post('/admonition-types', {
				admonition_type_name: newAdmType.admonition_type_name.trim(),
				amount: Number(newAdmType.amount)
			});
			addToast('Mahnungstyp hinzugefügt', 'success');
			newAdmType = { admonition_type_name: '', amount: '' };
			admTypes = await api.get('/admonition-types');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}

	// ── Employees ─────────────────────────────────────
	async function addEmployee() {
		if (!newEmployee.employee_name.trim()) return addToast('Name ist erforderlich', 'warning');
		if (!newEmployee.employee_username.trim()) return addToast('Benutzername ist erforderlich', 'warning');
		if (!newEmployee.employee_password.trim()) return addToast('Passwort ist erforderlich', 'warning');
		saving = true;
		try {
			await api.post('/employees', {
				employee_name: newEmployee.employee_name.trim(),
				employee_username: newEmployee.employee_username.trim(),
				employee_password: newEmployee.employee_password
			});
			addToast('Mitarbeiter hinzugefügt', 'success');
			newEmployee = { employee_name: '', employee_username: '', employee_password: '' };
			employees = await api.get('/employees');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}

	// ── Addresses ─────────────────────────────────────
	async function addAddress() {
		if (!newAddress.street.trim() || !newAddress.city.trim() || !newAddress.zipcode.trim()) {
			return addToast('Alle Adressfelder sind erforderlich', 'warning');
		}
		saving = true;
		try {
			await api.post('/addresses', {
				street: newAddress.street.trim(),
				city: newAddress.city.trim(),
				zipcode: newAddress.zipcode.trim()
			});
			addToast('Adresse hinzugefügt', 'success');
			newAddress = { street: '', city: '', zipcode: '' };
			addresses = await api.get('/addresses');
		} catch { /* handled */ } finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Einstellungen — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Einstellungen</h1>
</div>

<!-- Tab navigation -->
<div class="tab-nav">
	{#each TABS as tab}
		<button
			class="tab-btn"
			class:active={activeTab === tab.id}
			onclick={() => (activeTab = tab.id)}
		>{tab.label}</button>
	{/each}
</div>

{#if loading}
	<div class="loading-state"><div class="spinner"></div> Laden…</div>
{:else}

	<!-- Genres Tab -->
	{#if activeTab === 'genres'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Genres ({genres.length})</h3>
					{#if genres.length === 0}
						<p class="empty-inline">Noch keine Genres vorhanden.</p>
					{:else}
						<ul class="item-list">
							{#each genres as g (g.id)}
								<li>
									<span>{g.genre_name}</span>
									<button class="btn btn-danger btn-xs" onclick={() => deleteItem('/genres', g, 'genre_name')}>Löschen</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Genre hinzufügen</h3>
					<div class="form-group">
						<label for="gname">Genre-Name</label>
						<input id="gname" bind:value={newGenre} placeholder="z.B. Science Fiction"
							onkeydown={(e) => e.key === 'Enter' && addGenre()} />
					</div>
					<button class="btn btn-primary" onclick={addGenre} disabled={saving}>Genre hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Authors Tab -->
	{#if activeTab === 'authors'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Autoren ({authors.length})</h3>
					{#if authors.length === 0}
						<p class="empty-inline">Noch keine Autoren vorhanden.</p>
					{:else}
						<ul class="item-list">
							{#each authors as a (a.id)}
								<li>
									<span>{a.author_name}</span>
									<button class="btn btn-danger btn-xs" onclick={() => deleteItem('/authors', a, 'author_name')}>Löschen</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Autor hinzufügen</h3>
					<div class="form-group">
						<label for="aname">Autorenname</label>
						<input id="aname" bind:value={newAuthor} placeholder="Vor- und Nachname"
							onkeydown={(e) => e.key === 'Enter' && addAuthor()} />
					</div>
					<button class="btn btn-primary" onclick={addAuthor} disabled={saving}>Autor hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Book Conditions Tab -->
	{#if activeTab === 'conditions'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Buchzustände ({conditions.length})</h3>
					{#if conditions.length === 0}
						<p class="empty-inline">Noch keine Zustände vorhanden.</p>
					{:else}
						<ul class="item-list">
							{#each conditions as c (c.id)}
								<li>
									<span class="badge badge-neutral">{c.book_condition_name}</span>
									<button class="btn btn-danger btn-xs" onclick={() => deleteItem('/book-conditions', c, 'book_condition_name')}>Löschen</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Zustand hinzufügen</h3>
					<div class="form-group">
						<label for="cname">Zustandsname</label>
						<input id="cname" bind:value={newCondition} placeholder="z.B. Neu, Gut, Abgenutzt"
							onkeydown={(e) => e.key === 'Enter' && addCondition()} />
					</div>
					<button class="btn btn-primary" onclick={addCondition} disabled={saving}>Zustand hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Admonition Types Tab -->
	{#if activeTab === 'adm-types'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Mahnungstypen ({admTypes.length})</h3>
					{#if admTypes.length === 0}
						<p class="empty-inline">Noch keine Mahnungstypen vorhanden.</p>
					{:else}
						<ul class="item-list">
							{#each admTypes as t (t.id)}
								<li>
									<div>
										<strong>{t.admonition_type_name}</strong>
										<span class="amount-chip">€{Number(t.amount ?? 0).toFixed(2)}</span>
									</div>
									<button class="btn btn-danger btn-xs" onclick={() => deleteItem('/admonition-types', t, 'admonition_type_name')}>Löschen</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Mahnungstyp hinzufügen</h3>
					<div class="form-group">
						<label for="tname">Typbezeichnung</label>
						<input id="tname" bind:value={newAdmType.admonition_type_name} placeholder="z.B. Verspätete Rückgabe" />
					</div>
					<div class="form-group">
						<label for="tamount">Betrag (€)</label>
						<input id="tamount" type="number" min="0" step="0.01" bind:value={newAdmType.amount} placeholder="5.00" />
					</div>
					<button class="btn btn-primary" onclick={addAdmType} disabled={saving}>Typ hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Employees Tab -->
	{#if activeTab === 'employees'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Mitarbeiter ({employees.length})</h3>
					{#if employees.length === 0}
						<p class="empty-inline">Noch keine Mitarbeiter vorhanden.</p>
					{:else}
						<ul class="item-list">
							{#each employees as e (e.id)}
								<li>
									<div>
										<strong>{e.employee_name}</strong>
										<span class="username-chip">@{e.employee_username}</span>
									</div>
									<button class="btn btn-danger btn-xs" onclick={() => deleteItem('/employees', e, 'employee_name')}>Löschen</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Mitarbeiter hinzufügen</h3>
					<div class="form-group">
						<label for="ename">Vollständiger Name</label>
						<input id="ename" bind:value={newEmployee.employee_name} placeholder="Max Mustermann" />
					</div>
					<div class="form-group">
						<label for="euname">Benutzername</label>
						<input id="euname" bind:value={newEmployee.employee_username} placeholder="maxmuster" />
					</div>
					<div class="form-group">
						<label for="epwd">Passwort</label>
						<input id="epwd" type="password" bind:value={newEmployee.employee_password} placeholder="••••••••" />
					</div>
					<button class="btn btn-primary" onclick={addEmployee} disabled={saving}>Mitarbeiter hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Addresses Tab -->
	{#if activeTab === 'addresses'}
		<div class="settings-layout">
			<div class="card list-card">
				<div class="card-body">
					<h3 class="list-title">Adressen ({addresses.length})</h3>
					{#if addresses.length === 0}
						<p class="empty-inline">Noch keine Adressen vorhanden.</p>
					{:else}
						<ul class="item-list addr-list">
							{#each addresses as a (a.id)}
								<li>
									<div class="addr-info">
										<span class="addr-street">{a.street}</span>
										<span class="addr-city">{a.zipcode} {a.city}</span>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
			<div class="card add-card">
				<div class="card-body">
					<h3 class="list-title">Adresse hinzufügen</h3>
					<div class="form-group">
						<label for="astreet">Straße</label>
						<input id="astreet" bind:value={newAddress.street} placeholder="Musterstraße 1" />
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="azip">PLZ</label>
							<input id="azip" bind:value={newAddress.zipcode} placeholder="12345" />
						</div>
						<div class="form-group">
							<label for="acity">Stadt</label>
							<input id="acity" bind:value={newAddress.city} placeholder="Musterstadt" />
						</div>
					</div>
					<button class="btn btn-primary" onclick={addAddress} disabled={saving}>Adresse hinzufügen</button>
				</div>
			</div>
		</div>
	{/if}

{/if}

<style>
	.settings-layout {
		display: grid;
		grid-template-columns: 1fr 380px;
		gap: 1.5rem;
		align-items: start;
	}

	.list-title {
		font-size: 0.9375rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--text);
	}

	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius);
		background: #f8fafc;
		font-size: 0.875rem;
		gap: 0.75rem;
	}

	.item-list li:hover {
		background: #f0f4f8;
	}

	.empty-inline {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.amount-chip {
		display: inline-block;
		margin-left: 0.5rem;
		font-size: 0.8125rem;
		color: var(--warning-h);
		font-weight: 600;
	}

	.username-chip {
		display: inline-block;
		margin-left: 0.5rem;
		font-size: 0.8125rem;
		color: var(--text-muted);
		font-family: 'SFMono-Regular', monospace;
	}

	.addr-list li {
		align-items: flex-start;
	}

	.addr-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.addr-street {
		font-weight: 500;
	}

	.addr-city {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	@media (max-width: 900px) {
		.settings-layout {
			grid-template-columns: 1fr;
		}

		.list-card {
			order: 2;
		}

		.add-card {
			order: 1;
		}
	}
</style>
