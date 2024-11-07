<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { ArrowRight } from 'lucide-svelte';
</script>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="text-center">
		<h1 class="mb-6 text-5xl font-bold">Welcome to Hinagiku</h1>
		<p class="mb-8 text-xl text-gray-600">
			Intelligent system designed to support discussions in educational environments
		</p>

		<div class="flex justify-center gap-4">
			{#if $user}
				<a
					href="/dashboard"
					class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
				>
					Go to Dashboard
					<ArrowRight size={20} />
				</a>
			{:else}
				<a
					href="/login"
					class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
				>
					Get Started
					<ArrowRight size={20} />
				</a>
			{/if}
		</div>

		<div class="mt-16 grid gap-8 md:grid-cols-3">
			<div class="rounded-lg border p-6">
				<h2 class="mb-3 text-xl font-semibold">Real-time Transcription</h2>
				<p class="text-gray-600">
					Capture and analyze discussions in real-time for immediate insights and feedback.
				</p>
			</div>
			<div class="rounded-lg border p-6">
				<h2 class="mb-3 text-xl font-semibold">Intelligent Analysis</h2>
				<p class="text-gray-600">
					Advanced AI-powered analysis to help hosts provide timely and meaningful feedback.
				</p>
			</div>
			<div class="rounded-lg border p-6">
				<h2 class="mb-3 text-xl font-semibold">Educational Focus</h2>
				<p class="text-gray-600">
					Designed specifically for educational environments to enhance learning outcomes.
				</p>
			</div>
		</div>
	</div>
</main>
