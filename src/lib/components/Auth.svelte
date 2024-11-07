<script lang="ts">
	import { signInWithGoogle, signOut, user } from '$lib/stores/auth';
	import { LogIn } from 'lucide-svelte';
</script>

{#if $user}
	<div>
		<p>Welcome, {$user.displayName}!</p>
		<button on:click={signOut}>Sign Out</button>
	</div>
{:else}
	<button on:click={signInWithGoogle}>
		<LogIn /> Sign in with Google
	</button>
{/if}
