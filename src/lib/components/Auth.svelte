<script lang="ts">
	import { signInWithGoogle, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { Button } from 'flowbite-svelte';
</script>

{#if $user}
	<div>
		<p class="inline-block">Welcome, {$profile?.displayName || $user.displayName}!</p>
		<Button href="/dashboard" color="primary">Dashboard</Button>
	</div>
{:else}
	<button
		class="inline-flex h-10 w-auto cursor-pointer items-center space-x-2"
		on:click={signInWithGoogle}
	>
		<img class="max-h-8" src="/Google.png" alt="Sign in With Google" />
		<div class="w-auto text-lg">Sign in</div>
	</button>
{/if}

<style>
</style>
