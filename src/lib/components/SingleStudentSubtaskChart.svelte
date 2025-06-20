<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define types for the data structure
	type SessionData = {
		sessionId: string;
		sessionTitle: string;
		completionRate: number;
		averageCompletionRate: number;
	};

	// Props
	export let studentName: string = '';
	export let sessions: SessionData[] = [];

	// Chart instance
	let chartInstance: Chart | null = null;
	let chartCanvas: HTMLCanvasElement;

	// Function to update chart
	function updateChart() {
		if (!chartCanvas || !sessions.length) return;

		// Destroy existing chart if it exists
		if (chartInstance) {
			chartInstance.destroy();
		}

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: sessions.map((session) => session.sessionTitle),
				datasets: [
					{
						label: m.chartSubtaskCompletionRate(),
						data: sessions.map((session) => session.completionRate),
						backgroundColor: 'rgba(168, 85, 247, 0.7)',
						borderColor: 'rgba(168, 85, 247, 1)',
						borderWidth: 1,
						order: 1
					},
					{
						type: 'line',
						label: m.chartClassAverageSubtaskCompletionRate(),
						data: sessions.map((session) => session.averageCompletionRate),
						borderColor: 'rgba(234, 88, 12, 1)',
						backgroundColor: 'rgba(234, 88, 12, 0.7)',
						fill: false,
						tension: 0.1,
						order: 0
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
								if (context.dataset.type === 'line') {
									return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
								}
								return `${studentName}: ${context.parsed.y.toFixed(1)}%`;
							}
						}
					}
				},
				scales: {
					x: {
						title: {
							display: true,
							text: m.chartSession(),
							font: {
								weight: 'bold'
							}
						}
					},
					y: {
						beginAtZero: true,
						max: 100,
						title: {
							display: true,
							text: m.chartCompletionRate(),
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
	$: if (sessions) {
		updateChart();
	}

	onMount(() => {
		updateChart();
	});
</script>

<div class="h-[400px] w-full">
	<canvas bind:this={chartCanvas}></canvas>
</div>
