<script lang="ts">
	import { signInWithGoogle, signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
</script>

{#if $user}
	<div>
		<p class="inline-block">Welcome, {$profile?.displayName || $user.displayName}!</p>
		<button class="rounded-lg" on:click={signOut}>Sign Out</button>
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
