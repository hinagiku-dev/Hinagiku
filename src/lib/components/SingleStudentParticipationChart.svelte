<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables, type ChartDataset } from 'chart.js';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define types for the data structure
	type SessionData = {
		sessionId: string;
		sessionTitle: string;
		words: number;
		averageWords: number | null;
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

		const chartDatasets: ChartDataset[] = [
			{
				label: m.chartWords(),
				data: sessions.map((session) => session.words),
				backgroundColor: 'rgba(34, 197, 94, 0.7)',
				borderColor: 'rgba(34, 197, 94, 1)',
				borderWidth: 1,
				order: 1
			}
		];

		if (sessions.some((s) => s.averageWords !== null && s.averageWords !== 0)) {
			chartDatasets.push({
				type: 'line',
				label: m.chartAverageWords(),
				data: sessions.map((session) => session.averageWords),
				borderColor: 'rgba(234, 88, 12, 1)',
				backgroundColor: 'rgba(234, 88, 12, 0.7)',
				fill: false,
				tension: 0.1,
				order: 0
			});
		}

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: sessions.map((session) => session.sessionTitle),
				datasets: chartDatasets
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
								if (context.parsed.y === null) return '';
								if (context.datasetIndex === 1) {
									return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} ${m.chartWords()}`;
								}
								return `${studentName}: ${context.parsed.y} ${m.chartWords()}`;
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
						title: {
							display: true,
							text: m.chartWords(),
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
