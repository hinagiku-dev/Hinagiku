<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { Button, Card } from 'flowbite-svelte';
	import { ArrowRight, Mic, Brain, GraduationCap } from 'lucide-svelte';
</script>

<main class="min-h-screen">
	<div class="bg-gradient-to-b from-primary-50 to-white">
		<div class="mx-auto max-w-6xl px-4 py-24">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div class="text-left">
					<h1 class="mb-6 text-5xl font-bold leading-tight text-gray-900">
						Transform Educational Discussions with <span class="text-primary-600">AI-Powered</span> Insights
					</h1>
					<p class="mb-8 text-xl text-gray-600">
						Hinagiku helps educators facilitate more engaging and productive discussions through
						real-time transcription and intelligent analysis.
					</p>
					<div class="flex gap-4">
						{#if $user}
							<Button size="xl" class="gap-2" href="/dashboard">
								Go to Dashboard
								<ArrowRight size={20} />
							</Button>
						{:else}
							<Button size="xl" class="gap-2" href="/login">
								Get Started
								<ArrowRight size={20} />
							</Button>
							<Button size="xl" color="light" href="#features">Learn More</Button>
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
				<h2 class="mb-4 text-3xl font-bold text-gray-900">Why Choose Hinagiku?</h2>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					Our platform combines cutting-edge technology with educational expertise to enhance
					learning outcomes.
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Mic class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">Real-time Transcription</h3>
					<p class="text-gray-600">
						Capture every valuable insight from your discussions with our advanced speech-to-text
						technology.
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Brain class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">Intelligent Analysis</h3>
					<p class="text-gray-600">
						Get AI-powered insights and suggestions to improve discussion quality and participation.
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<GraduationCap class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">Educational Focus</h3>
					<p class="text-gray-600">
						Purpose-built for educational environments with features that support meaningful
						learning.
					</p>
				</Card>
			</div>
		</div>
	</div>

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
					<h2 class="mb-6 text-3xl font-bold text-gray-900">The Story Behind Our Name</h2>
					<div class="space-y-4 text-gray-600">
						<p>
							<span class="font-semibold text-primary-600">Hinagiku (雛菊)</span>, or Daisy in
							English, is an intelligent system designed to support discussions in educational
							environments.
						</p>
						<p>
							One of Hinagiku's key features is its real-time voice transcription and analysis,
							which helps hosts provide timely and insightful feedback, setting it apart from other
							educational tools.
						</p>
						<p>
							We chose the name Hinagiku because it reflects our core values:
							<span class="font-medium text-gray-900">resilience, simplicity, and growth</span>—much
							like the daisy flower itself, which flourishes in diverse conditions.
						</p>
						<p>
							Our mission is to help participants and hosts connect meaningfully by providing tools
							that facilitate better communication and collaboration in classrooms.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
