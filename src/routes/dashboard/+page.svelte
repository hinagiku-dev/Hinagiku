<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { MessageSquarePlus, UserPlus, UserCog } from 'lucide-svelte';
	let { data } = $props();
</script>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="mt-2 text-gray-600">Welcome back, {$user?.displayName}</p>
		</div>
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
		<div class="space-y-2 rounded-lg border">
			{#if data.createdSessions}
				{#each data.createdSessions as session}
					<a
						class="block w-auto rounded-lg bg-blue-500 px-4 py-1 text-left text-lg text-white no-underline shadow-md hover:bg-blue-600"
						href="/session/{session.id}"
					>
						<span class="text-2xl">{session.title}</span>
						<div class="flex items-center justify-between">
							<span class="text-lg">Host by: {session.hostName}</span>
							<span class="text-right text-lg">{session.tempId}</span>
						</div>
					</a>
				{/each}
			{:else}
				<div class="p-8 text-center text-gray-600">
					<p>No recent sessions found</p>
					<p class="mt-2 text-sm">Create or join a session to get started</p>
				</div>
			{/if}
		</div>
	</div>
</main>
