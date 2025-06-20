<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { Card } from 'flowbite-svelte';
	import { Activity } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Register Chart.js components
	Chart.register(...registerables);

	// Define types for the data structure
	type Participant = {
		displayName: string;
		words: number;
		seatNumber?: string | null;
	};
	type SessionData = {
		sessionId: string;
		sessionTitle: string;
		participants: Participant[];
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

		// Get all unique student info, and sort them by seat number
		const allParticipants = new Map<string, { displayName: string; seatNumber?: string | null }>();
		sessions.forEach((session) => {
			session.participants.forEach((p) => {
				if (!allParticipants.has(p.displayName)) {
					allParticipants.set(p.displayName, {
						displayName: p.displayName,
						seatNumber: p.seatNumber
					});
				}
			});
		});

		const sortedParticipants = Array.from(allParticipants.values()).sort((a, b) => {
			const seatA = a.seatNumber ? parseInt(a.seatNumber, 10) : Infinity;
			const seatB = b.seatNumber ? parseInt(b.seatNumber, 10) : Infinity;
			if (isNaN(seatA) && isNaN(seatB)) return a.displayName.localeCompare(b.displayName);
			if (isNaN(seatA)) return 1;
			if (isNaN(seatB)) return -1;
			return seatA - seatB;
		});

		const studentLabels = sortedParticipants.map((p) => p.displayName);

		// Prepare datasets
		const datasets = sessions.map((session, index) => ({
			label: session.sessionTitle,
			data: studentLabels.map((displayName) => {
				const participant = session.participants.find((p) => p.displayName === displayName);
				return participant ? participant.words : 0;
			}),
			backgroundColor: generateColors(sessions.length)[index * 2],
			borderColor: generateColors(sessions.length)[index * 2 + 1],
			borderWidth: 1
		}));

		// Create new chart
		chartInstance = new Chart(chartCanvas, {
			type: 'bar',
			data: {
				labels: studentLabels,
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
