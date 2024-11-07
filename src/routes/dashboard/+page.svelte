<script lang="ts">
	import { user, signOut } from '$lib/stores/auth';
	import { MessageSquarePlus, UserPlus, UserCog, LogOut } from 'lucide-svelte';
</script>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="mt-2 text-gray-600">Welcome back, {$user?.displayName}</p>
		</div>

		<button
			on:click={signOut}
			class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-100"
		>
			<LogOut size={20} />
			<span>Sign Out</span>
		</button>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Create Discussion Session -->
		<a
			href="/create"
			class="flex flex-col items-center rounded-lg border p-8 transition-all hover:border-blue-500 hover:shadow-lg"
		>
			<MessageSquarePlus size={48} class="mb-4 text-blue-600" />
			<h2 class="mb-2 text-xl font-semibold">Create Discussion Session</h2>
			<p class="text-center text-gray-600">Start a new discussion session as a host</p>
		</a>

		<!-- Join Discussion Session -->
		<a
			href="/join"
			class="flex flex-col items-center rounded-lg border p-8 transition-all hover:border-blue-500 hover:shadow-lg"
		>
			<UserPlus size={48} class="mb-4 text-blue-600" />
			<h2 class="mb-2 text-xl font-semibold">Join Discussion Session</h2>
			<p class="text-center text-gray-600">Join an existing discussion using a session code</p>
		</a>

		<!-- Edit Profile -->
		<a
			href="/profile"
			class="flex flex-col items-center rounded-lg border p-8 transition-all hover:border-blue-500 hover:shadow-lg"
		>
			<UserCog size={48} class="mb-4 text-blue-600" />
			<h2 class="mb-2 text-xl font-semibold">Edit Profile</h2>
			<p class="text-center text-gray-600">Update your profile settings and preferences</p>
		</a>
	</div>

	<!-- Recent Sessions -->
	<div class="mt-12">
		<h2 class="mb-4 text-2xl font-semibold">Recent Sessions</h2>
		<div class="rounded-lg border">
			{#if false}
				<!-- Replace with actual sessions data -->
				<!-- Session list here -->
			{:else}
				<div class="p-8 text-center text-gray-600">
					<p>No recent sessions found</p>
					<p class="mt-2 text-sm">Create or join a session to get started</p>
				</div>
			{/if}
		</div>
	</div>
</main>
