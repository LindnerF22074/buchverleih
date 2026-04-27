<script>
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { auth, logout } from '$lib/auth.svelte.js';

	let { children } = $props();

	const navLinks = [
		{ href: '/', label: 'Dashboard', icon: '◈' },
		{ href: '/books', label: 'Bücher', icon: '◉' },
		{ href: '/customers', label: 'Kunden', icon: '◎' },
		{ href: '/rentals', label: 'Ausleihen', icon: '◐' },
		{ href: '/admonitions', label: 'Mahnungen', icon: '◭' },
		{ href: '/settings', label: 'Einstellungen', icon: '⚙' }
	];

	let mobileOpen = $state(false);

	$effect(() => {
		if (!auth.token && $page.url.pathname !== '/login') {
			goto('/login');
		}
	});

	/** @param {string} href */
	function isActive(href) {
		const path = $page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

{#if $page.url.pathname === '/login'}
	{@render children()}
{:else if auth.token}
	<div class="app-shell">
		<aside class="sidebar" class:open={mobileOpen}>
			<div class="sidebar-brand">
				<span class="brand-icon">📖</span>
				<span class="brand-name">Buchverleih</span>
			</div>
			<nav class="sidebar-nav">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link"
						class:active={isActive(link.href)}
						onclick={() => (mobileOpen = false)}
					>
						<span class="nav-icon">{link.icon}</span>
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="sidebar-user">
				<span class="user-name">{auth.employee?.employee_name ?? 'Mitarbeiter'}</span>
				<button class="logout-btn" onclick={handleLogout}>Abmelden</button>
			</div>
		</aside>

		{#if mobileOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="mobile-overlay" onclick={() => (mobileOpen = false)}></div>
		{/if}

		<header class="mobile-header">
			<button class="hamburger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Navigation">
				<span></span><span></span><span></span>
			</button>
			<span class="mobile-title">Buchverleih</span>
		</header>

		<main class="main">
			{@render children()}
		</main>
	</div>
{/if}

<Toast />

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: var(--sidebar-w);
		min-height: 100vh;
		background: #0f172a;
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 200;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		overflow-y: auto;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 1.25rem 1.25rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.brand-icon { font-size: 1.375rem; line-height: 1; }

	.brand-name {
		font-size: 1rem;
		font-weight: 700;
		color: #f8fafc;
		letter-spacing: -0.02em;
	}

	.sidebar-nav { padding: 0.75rem 0; flex: 1; }

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.6875rem 1.25rem;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: background 0.15s, color 0.15s;
		position: relative;
	}

	.nav-link:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
	.nav-link.active { background: rgba(37,99,235,0.3); color: #93c5fd; }
	.nav-link.active::before {
		content: '';
		position: absolute;
		left: 0; top: 0; bottom: 0;
		width: 3px;
		background: #3b82f6;
		border-radius: 0 2px 2px 0;
	}

	.nav-icon { font-size: 1.1rem; width: 1.25rem; text-align: center; opacity: 0.7; }
	.nav-link.active .nav-icon { opacity: 1; }

	.sidebar-user {
		padding: 0.875rem 1.25rem;
		border-top: 1px solid rgba(255,255,255,0.06);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.user-name {
		font-size: 0.8125rem;
		color: rgba(255,255,255,0.7);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.logout-btn {
		background: rgba(255,255,255,0.07);
		border: 1px solid rgba(255,255,255,0.12);
		color: rgba(255,255,255,0.6);
		border-radius: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s, color 0.15s;
		text-align: left;
	}

	.logout-btn:hover { background: rgba(239,68,68,0.2); color: #fca5a5; border-color: rgba(239,68,68,0.3); }

	.mobile-header {
		display: none;
		position: fixed;
		top: 0; left: 0; right: 0;
		height: 3.5rem;
		background: #0f172a;
		z-index: 150;
		align-items: center;
		padding: 0 1rem;
		gap: 1rem;
		box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	}

	.hamburger {
		background: none; border: none; cursor: pointer;
		display: flex; flex-direction: column; gap: 0.3125rem;
		padding: 0.375rem; border-radius: 0.25rem;
	}

	.hamburger span { display: block; width: 1.25rem; height: 2px; background: #f8fafc; border-radius: 1px; }
	.mobile-title { font-size: 1rem; font-weight: 700; color: #f8fafc; }

	.mobile-overlay {
		display: none; position: fixed; inset: 0;
		background: rgba(0,0,0,0.55); z-index: 199; backdrop-filter: blur(2px);
	}

	.main {
		flex: 1;
		margin-left: var(--sidebar-w);
		padding: 2rem 2.5rem;
		min-height: 100vh;
		max-width: 100%;
	}

	@media (max-width: 768px) {
		.mobile-header { display: flex; }
		.mobile-overlay { display: block; }
		.sidebar { transform: translateX(-100%); }
		.sidebar.open { transform: translateX(0); }
		.main { margin-left: 0; padding: 1rem; padding-top: 4.5rem; }
	}
</style>
