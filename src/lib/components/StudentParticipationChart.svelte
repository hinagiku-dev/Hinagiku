<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { Card } from 'flowbite-svelte';
	import { Activity } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define types for the data structure
	type SessionData = {
		sessionId: string;
		sessionTitle: string;
		participants: {
			[studentId: string]: {
				words: number;
			};
		};
	};

	// Props
	export let sessions: SessionData[] = [];

	// Chart instance
	let chartInstance: Chart | null = null;
	let chartCanvas: HTMLCanvasElement;

	// Generate random colors for sessions
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
		if (!chartCanvas || !sessions.length) return;

		// Destroy existing chart if it exists
		if (chartInstance) {
			chartInstance.destroy();
		}

		// Get all unique student IDs
		const studentIds = new Set<string>();
		sessions.forEach((session) => {
			Object.keys(session.participants).forEach((studentId) => {
				studentIds.add(studentId);
			});
		});

		// Prepare datasets
		const datasets = sessions.map((session, index) => ({
			label: session.sessionTitle,
			data: Array.from(studentIds).map((studentId) => session.participants[studentId]?.words || 0),
			backgroundColor: generateColors(sessions.length)[index * 2],
			borderColor: generateColors(sessions.length)[index * 2 + 1],
			borderWidth: 1
		}));

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: Array.from(studentIds),
				datasets: datasets
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: m.chartStudentParticipation(),
						font: {
							size: 16,
							weight: 'bold'
						}
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
							text: m.chartStudents(),
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
	$: if (sessions) {
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
			<h3 class="text-lg font-semibold text-gray-900">{m.chartStudentParticipation()}</h3>
		</div>
		<p class="text-sm text-gray-600">
			{m.chartStudentParticipationDesc()}
		</p>
	</div>

	<div class="h-[400px] w-full">
		<canvas bind:this={chartCanvas}></canvas>
	</div>
</Card>
