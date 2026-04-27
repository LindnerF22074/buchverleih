<script>
	import { addToast } from '$lib/toast.svelte.js';
	import { login } from '$lib/auth.svelte.js';
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleLogin() {
		if (!username.trim() || !password.trim()) {
			addToast('Benutzername und Passwort erforderlich', 'warning');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ employee_username: username, employee_password: password })
			});
			const data = await res.json();
			if (!res.ok) {
				addToast(data.error || 'Anmeldung fehlgeschlagen', 'error');
				return;
			}
			login(data.token, { employee_id: data.employee_id, employee_name: data.employee_name });
			goto('/');
		} catch {
			addToast('Verbindung zum Server fehlgeschlagen', 'error');
		} finally {
			loading = false;
		}
	}

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (e.key === 'Enter') handleLogin();
	}
</script>

<svelte:head><title>Anmelden — Buchverleih</title></svelte:head>

<div class="login-page">
	<div class="login-card">
		<div class="login-header">
			<span class="login-icon">📖</span>
			<h1 class="login-title">Buchverleih</h1>
			<p class="login-sub">Bibliotheksverwaltung</p>
		</div>

		<div class="form-group">
			<label for="uname">Benutzername</label>
			<input
				id="uname"
				type="text"
				bind:value={username}
				placeholder="Benutzername eingeben"
				onkeydown={onKey}
				autocomplete="username"
			/>
		</div>
		<div class="form-group">
			<label for="pw">Passwort</label>
			<input
				id="pw"
				type="password"
				bind:value={password}
				placeholder="••••••••"
				onkeydown={onKey}
				autocomplete="current-password"
			/>
		</div>

		<button class="btn btn-primary login-btn" onclick={handleLogin} disabled={loading}>
			{loading ? 'Anmelden…' : 'Anmelden'}
		</button>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f1f5f9;
		padding: 1rem;
	}

	.login-card {
		background: #fff;
		border-radius: 1rem;
		padding: 2.5rem;
		width: 100%;
		max-width: 380px;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.08),
			0 1px 4px rgba(0, 0, 0, 0.04);
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 0.625rem;
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: #0f172a;
	}

	.login-sub {
		color: var(--text-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.login-btn {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.75rem;
		font-size: 1rem;
	}
</style>
