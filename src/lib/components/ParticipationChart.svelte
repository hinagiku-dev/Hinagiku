<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { Card } from 'flowbite-svelte';
	import { Activity } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define the type for participation data
	type SessionParticipation = {
		sessionName: string;
		participation: number;
	};

	type ClassData = {
		className: string;
		sessions: SessionParticipation[];
	};

	// Props
	export let data: ClassData[] = [];

	// Chart instance
	let chartInstance: Chart | null = null;
	let chartCanvas: HTMLCanvasElement;

	// Generate colors for sessions
	function generateColors(count: number): string[] {
		const colors = [];
		for (let i = 0; i < count; i++) {
			const hue = (i * 137.5) % 360; // Golden angle approximation
			colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
			colors.push(`hsla(${hue}, 70%, 60%, 1)`);
		}
		return colors;
	}

	// Function to update chart
	function updateChart() {
		if (!chartCanvas) return;

		// Destroy existing chart if it exists
		if (chartInstance) {
			chartInstance.destroy();
		}

		// Get all unique session names
		const sessionNames = new Set<string>();
		data.forEach((classData) => {
			classData.sessions.forEach((session) => {
				sessionNames.add(session.sessionName);
			});
		});

		// Prepare datasets for each session
		const datasets = Array.from(sessionNames).map((sessionName, index) => ({
			label: sessionName,
			data: data.map((classData) => {
				const session = classData.sessions.find((s) => s.sessionName === sessionName);
				return session ? session.participation : 0;
			}),
			backgroundColor: generateColors(sessionNames.size)[index * 2],
			borderColor: generateColors(sessionNames.size)[index * 2 + 1],
			borderWidth: 1
		}));

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: data.map((d) => d.className),
				datasets: datasets
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
								return `${context.dataset.label}: ${context.parsed.y} ${m.chartWords()}`;
							}
						}
					}
				},
				scales: {
					x: {
						stacked: true,
						title: {
							display: true,
							text: m.chartClass(),
							font: {
								weight: 'bold'
							}
						}
					},
					y: {
						stacked: true,
						beginAtZero: true,
						title: {
							display: true,
							text: m.chartTotalWords(),
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
				<Activity size={20} class="text-primary-600" />
			</div>
			<h3 class="text-lg font-semibold text-gray-900">{m.chartClassParticipation()}</h3>
		</div>
		<p class="text-sm text-gray-600">{m.chartClassParticipationDesc()}</p>
	</div>

	<div class="h-[400px] w-full">
		<canvas bind:this={chartCanvas}></canvas>
	</div>
</Card>
