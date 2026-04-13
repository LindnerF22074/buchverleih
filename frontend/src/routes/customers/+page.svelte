<script>
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { addToast } from '$lib/toast.svelte.js';
	import Modal from '$lib/components/Modal.svelte';

	// ── Data ──────────────────────────────────────────
	let customers = $state([]);
	let addresses = $state([]);
	let loading = $state(true);

	// ── Search & Sort ─────────────────────────────────
	let search = $state('');
	let sortCol = $state('customer_name');
	let sortDir = $state('asc');

	// ── Modals ────────────────────────────────────────
	let showAdd = $state(false);
	let showEdit = $state(false);

	// ── Form ──────────────────────────────────────────
	let emptyForm = () => ({
		customer_name: '',
		email: '',
		phone: '',
		address_id: '',
		newAddress: false,
		street: '',
		city: '',
		zipcode: ''
	});
	let form = $state(emptyForm());
	let editTarget = $state(null);

	// ── Derived ───────────────────────────────────────
	let filtered = $derived.by(() => {
		const q = search.toLowerCase();
		let list = q
			? customers.filter(
					(c) =>
						c.customer_name?.toLowerCase().includes(q) ||
						c.email?.toLowerCase().includes(q) ||
						c.phone?.toLowerCase().includes(q)
				)
			: [...customers];
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
			const [cRaw, aRaw] = await Promise.all([api.get('/customers'), api.get('/addresses')]);
			customers = normalizeCustomers(cRaw);
			addresses = Array.isArray(aRaw) ? aRaw : [];
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

	// ── Add Customer ──────────────────────────────────
	function openAdd() {
		form = emptyForm();
		showAdd = true;
	}

	async function resolveAddressId() {
		if (form.newAddress) {
			if (!form.street.trim() || !form.city.trim() || !form.zipcode.trim()) {
				addToast('Straße, Stadt und PLZ sind für die neue Adresse erforderlich', 'warning');
				return null;
			}
			const newAddr = await api.post('/addresses', {
				street: form.street.trim(),
				city: form.city.trim(),
				zipcode: form.zipcode.trim()
			});
			addresses = await api.get('/addresses');
			return newAddr?.id ?? newAddr?.address_id;
		}
		return form.address_id || undefined;
	}

	async function saveCustomer() {
		if (!form.customer_name.trim()) return addToast('Name ist erforderlich', 'warning');
		try {
			const address_id = await resolveAddressId();
			await api.post('/customers', {
				customer_name: form.customer_name.trim(),
				email: form.email.trim() || undefined,
				phone: form.phone.trim() || undefined,
				address_id: address_id || undefined
			});
			addToast('Kunde hinzugefügt', 'success');
			showAdd = false;
			customers = normalizeCustomers(await api.get('/customers'));
		} catch { /* handled */ }
	}

	// ── Edit Customer ─────────────────────────────────
	/** @param {any} c */
	function openEdit(c) {
		editTarget = normalizeCustomer(c);
		form = {
			customer_name: c.customer_name ?? '',
			email: c.email ?? '',
			phone: c.phone ?? '',
			address_id: c.address_id ?? '',
			newAddress: false,
			street: '',
			city: '',
			zipcode: ''
		};
		showEdit = true;
	}

	async function updateCustomer() {
		if (!form.customer_name.trim()) return addToast('Name ist erforderlich', 'warning');
		try {
			const id = editTarget?.id ?? editTarget?.customer_id ?? editTarget?.customerId;
			if (!id) return addToast('Kunden-ID fehlt', 'error');

			const address_id = await resolveAddressId();
			await api.put('/customers/' + id, {
				customer_name: form.customer_name.trim(),
				email: form.email.trim() || undefined,
				phone: form.phone.trim() || undefined,
				address_id: address_id || undefined
			});
			addToast('Kunde aktualisiert', 'success');
			showEdit = false;
			customers = normalizeCustomers(await api.get('/customers'));
		} catch { /* handled */ }
	}

	// ── Delete ────────────────────────────────────────
	/** @param {any} c */
	async function deleteCustomer(c) {
		if (!confirm(`Kunden "${c.customer_name}" löschen?`)) return;
		try {
			const id = c?.id ?? c?.customer_id ?? c?.customerId;
			if (!id) return addToast('Kunden-ID fehlt', 'error');

			await api.del('/customers/' + id);
			addToast('Kunde gelöscht', 'success');
			customers = normalizeCustomers(await api.get('/customers'));
		} catch { /* handled */ }
	}

	// ── Helpers ───────────────────────────────────────
	/** @param {any} c */
	function normalizeCustomer(c) {
		const id = c?.id ?? c?.customer_id ?? c?.customerId;
		return id == null ? c : { ...c, id };
	}

	/** @param {any} list */
	function normalizeCustomers(list) {
		return Array.isArray(list) ? list.map(normalizeCustomer) : [];
	}

	/** @param {any} addrId */
	function addrLabel(addrId) {
		const a = addresses.find((a) => String(a.id) === String(addrId));
		if (!a) return '—';
		return `${a.street}, ${a.zipcode} ${a.city}`;
	}

	/** @param {any} c */
	function displayAddr(c) {
		if (c.street) return `${c.street}, ${c.zipcode ?? ''} ${c.city ?? ''}`.trim();
		if (c.address_id) return addrLabel(c.address_id);
		return '—';
	}
</script>

<svelte:head><title>Kunden — Buchverleih</title></svelte:head>

<div class="page-header">
	<h1 class="page-title">Kunden</h1>
	<button class="btn btn-primary" onclick={openAdd}>+ Kunden hinzufügen</button>
</div>

<div class="filters">
	<input type="search" placeholder="Nach Name, E-Mail oder Telefon suchen…" bind:value={search} />
</div>

<div class="card">
	{#if loading}
		<div class="loading-state"><div class="spinner"></div> Kunden werden geladen…</div>
	{:else if filtered.length === 0}
		<div class="empty-state">Keine Kunden gefunden.</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="sortable" onclick={() => setSort('customer_name')}>Name {si('customer_name')}</th>
						<th class="sortable" onclick={() => setSort('email')}>E-Mail {si('email')}</th>
						<th>Telefon</th>
						<th>Adresse</th>
						<th>Aktionen</th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as c, i (c.id ?? i)}
						<tr>
							<td><strong>{c.customer_name}</strong></td>
							<td>{c.email ?? '—'}</td>
							<td>{c.phone ?? '—'}</td>
							<td class="addr-cell">{displayAddr(c)}</td>
							<td>
								<div class="td-actions">
									<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>Bearbeiten</button>
									<button class="btn btn-danger btn-sm" onclick={() => deleteCustomer(c)}>Löschen</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Add Customer Modal -->
<Modal title="Kunden hinzufügen" bind:open={showAdd}>
	{@render customerForm()}
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showAdd = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={saveCustomer}>Kunden hinzufügen</button>
	</div>
</Modal>

<!-- Edit Customer Modal -->
<Modal title="Kunden bearbeiten" bind:open={showEdit}>
	{@render customerForm()}
	<div class="form-actions">
		<button class="btn btn-secondary" onclick={() => (showEdit = false)}>Abbrechen</button>
		<button class="btn btn-primary" onclick={updateCustomer}>Änderungen speichern</button>
	</div>
</Modal>

{#snippet customerForm()}
	<div class="form-group">
		<label for="cname">Name <span class="req">*</span></label>
		<input id="cname" bind:value={form.customer_name} placeholder="Vollständiger Name" />
	</div>
	<div class="form-row">
		<div class="form-group">
			<label for="cemail">E-Mail</label>
			<input id="cemail" type="email" bind:value={form.email} placeholder="email@example.com" />
		</div>
		<div class="form-group">
			<label for="cphone">Telefon</label>
			<input id="cphone" type="tel" bind:value={form.phone} placeholder="+49 …" />
		</div>
	</div>
	<div class="form-group">
		<label for="caddr">Adresse</label>
		<select
			id="caddr"
			bind:value={form.address_id}
			onchange={() => (form.newAddress = form.address_id === '__new__')}
		>
			<option value="">— Keine Adresse —</option>
			{#each addresses as a}
				<option value={a.id}>{a.street}, {a.zipcode} {a.city}</option>
			{/each}
			<option value="__new__">+ Neue Adresse erstellen…</option>
		</select>
	</div>
	{#if form.address_id === '__new__'}
		<div class="inline-form">
			<div class="inline-form-title">Neue Adresse</div>
			<div class="form-group">
				<label for="nstreet">Straße <span class="req">*</span></label>
				<input id="nstreet" bind:value={form.street} placeholder="Musterstraße 1" />
			</div>
			<div class="form-row">
				<div class="form-group">
					<label for="nzip">PLZ <span class="req">*</span></label>
					<input id="nzip" bind:value={form.zipcode} placeholder="12345" />
				</div>
				<div class="form-group">
					<label for="ncity">Stadt <span class="req">*</span></label>
					<input id="ncity" bind:value={form.city} placeholder="Musterstadt" />
				</div>
			</div>
		</div>
	{/if}
{/snippet}

<style>
	.addr-cell {
		font-size: 0.8125rem;
		color: var(--text-muted);
		max-width: 240px;
	}

	.req {
		color: var(--danger);
	}
</style>
