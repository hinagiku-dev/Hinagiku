<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { Card } from 'flowbite-svelte';
	import { MessageSquare } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define the type for discussion data
	type DiscussionData = {
		discussionName: string;
		participation: number;
	};

	// Props
	export let data: DiscussionData[] = [];

	// Chart instance
	let chartInstance: Chart | null = null;
	let chartCanvas: HTMLCanvasElement;

	// Function to update chart
	function updateChart() {
		if (!chartCanvas) return;

		// Destroy existing chart if it exists
		if (chartInstance) {
			chartInstance.destroy();
		}

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.discussionName),
				datasets: [
					{
						label: m.chartAverageWordsPerParticipant(),
						data: data.map((d) => d.participation),
						backgroundColor: 'rgba(99, 102, 241, 0.7)',
						borderColor: 'rgba(99, 102, 241, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function (context) {
								return `${m.chartAverageWordsPerParticipant()}: ${context.parsed.y} ${m.chartWords()}`;
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: m.chartDiscussion(),
							font: {
								weight: 'bold'
							}
						}
					},
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: m.chartAverageWords(),
							font: {
								weight: 'bold'
							}
						}
					}
				}
			}
		});
	}

	// Update chart when data changes
	$: if (data) {
		updateChart();
	}

	onMount(() => {
		updateChart();
	});
</script>

<Card padding="lg" class="w-full !max-w-none">
	<div class="mb-4">
		<div class="mb-3 flex items-center gap-3">
			<div class="rounded-full bg-primary-100 p-2">
				<MessageSquare size={20} class="text-primary-600" />
			</div>
			<h3 class="text-lg font-semibold text-gray-900">{m.chartDiscussionParticipation()}</h3>
		</div>
		<p class="text-sm text-gray-600">{m.chartDiscussionParticipationDesc()}</p>
	</div>

	<div class="h-[400px] w-full">
		<canvas bind:this={chartCanvas}></canvas>
	</div>
</Card>
