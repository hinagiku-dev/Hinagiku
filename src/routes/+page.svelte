<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { Button, Card } from 'flowbite-svelte';
	import { ArrowRight, Mic, Brain, GraduationCap, Github } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let title = $state('Hinagiku');
	let highlight = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			let newHighlight;
			do {
				newHighlight = Math.floor(Math.random() * title.length);
			} while (newHighlight === highlight);
			highlight = newHighlight;
		}, 800);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Home | Hinagiku</title>
</svelte:head>

<main class="min-h-screen">
	<div class="bg-gradient-to-b from-primary-50 to-white">
		<div class="mx-auto max-w-6xl px-4 py-24">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div class="text-left">
					<h1 class="mb-6 font-bold leading-tight">
						<span class="mb-4 block text-2xl text-gray-900"
							>Transform Educational Discussions with</span
						>
						<span class="text-8xl text-gray-500">
							{#each title as c, i}
								<span
									class="transition-colors duration-500"
									class:text-primary-600={i === highlight}>{c}</span
								>
							{/each}
						</span>
					</h1>
					<p class="mb-8 text-xl text-gray-600">
						{m.intro()}
					</p>
					<div class="flex gap-4">
						{#if $user}
							<Button size="xl" class="gap-2" href="/dashboard">
								{m.dashboard()}
								<ArrowRight size={20} />
							</Button>
						{:else}
							<Button size="xl" class="gap-2" href="/login">
								{m.started()}
								<ArrowRight size={20} />
							</Button>
							<Button size="xl" color="light" href="#features">{m.learn()}</Button>
						{/if}
					</div>
				</div>
				<div class="hidden lg:block">
					<img src="/home.webp" alt="Educational Discussion" class="w-full" />
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div id="features" class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{m.whyChoose()}</h2>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					{m.whyChooseDesc()}
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Mic class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{m.transcript()}</h3>
					<p class="text-gray-600">
						{m.tr_details()}
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Brain class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{m.Itanalysis()}</h3>
					<p class="text-gray-600">
						{m.ia_details()}
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<GraduationCap class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{m.educational()}</h3>
					<p class="text-gray-600">
						{m.ef_details()}
					</p>
				</Card>
			</div>
		</div>
	</div>

	<!-- Workflow Section -->
	<div class="bg-gradient-to-b from-white via-primary-50/30 to-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{m.howItWorks()}</h2>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					{m.howItWorksDesc()}
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-4">
				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{m.preparation()}</h3>
					<p class="text-gray-600">
						{m.preparationDesc()}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{m.joinSession()}</h3>
					<p class="text-gray-600">
						{m.joinSessionDesc()}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{m.discussion()}</h3>
					<p class="text-gray-600">
						{m.discussionDesc()}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{m.analysis()}</h3>
					<p class="text-gray-600">
						{m.analysisDesc()}
					</p>
				</Card>
			</div>

			<div class="mt-12 text-center">
				<p class="mx-auto max-w-2xl text-gray-600">
					{m.Ai_describe()}
				</p>
			</div>
		</div>
	</div>

	<!-- Template Community Section -->
	<div class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div>
					<h2 class="mb-6 text-3xl font-bold text-gray-900">
						{m.communityDriven()}
					</h2>
					<div class="space-y-4 text-gray-600">
						<p class="text-xl">
							{m.communityDrivenDesc()}
						</p>
						<ul class="ml-6 list-disc space-y-3">
							<li>{m.browseTemplates()}</li>
							<li>{m.forkTemplates()}</li>
							<li>{m.shareTemplates()}</li>
							<li>{m.collaborateTemplates()}</li>
						</ul>
						<div class="mt-8">
							<Button size="xl" class="gap-2" href="/templates/public">
								{m.exploreTemplates()}
								<ArrowRight size={20} />
							</Button>
						</div>
					</div>
				</div>
				<div class="hidden lg:block">
					<img
						src="/templates-preview.webp"
						alt="Discussion Templates"
						class="w-full rounded-lg shadow-lg"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Story Behind Our Name section -->
	<div class="bg-gradient-to-b from-white via-primary-50/30 to-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div class="order-2 lg:order-1">
					<img
						src="/daisy-illustration.webp"
						alt="Hinagiku Daisy"
						class="mx-auto max-w-md rounded-lg shadow-lg"
					/>
				</div>
				<div class="order-1 lg:order-2">
					<h2 class="mb-6 text-3xl font-bold text-gray-900">{m.storyBehind()}</h2>
					<div class="space-y-4 text-gray-600">
						<p>
							<span class="font-semibold text-primary-600">Hinagiku (雛菊)</span>, {m.storyBehindDesc()}
						</p>
						<p>
							{m.realTime()}
						</p>
						<p>
							{m.coreValues()}
						</p>
						<p>
							{m.mission()}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- GitHub Section -->
	<div class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{m.openSource()}</h2>
				<p class="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
					{m.openSourceDesc()}
				</p>
				<Button
					size="xl"
					class="gap-2"
					href="https://github.com/hinagiku-dev/Hinagiku"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Github />
					{m.viewOnGitHub()}
				</Button>
			</div>
		</div>
	</div>
</main>
