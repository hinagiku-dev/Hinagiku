<script lang="ts">
	import * as echarts from 'echarts';
	import { onMount } from 'svelte';

	let {
		words = {},
		minFontSize = 10,
		maxFontSize = 40
	}: { words?: Record<string, number>; minFontSize?: number; maxFontSize?: number } = $props();

	let chart: echarts.ECharts | null = $state(null);
	let container: HTMLDivElement | null = $state(null);

	async function initChart() {
		await import('echarts-wordcloud');
		if (!container) return;

		chart = echarts.init(container);
		updateChart();

		const resizeObserver = new ResizeObserver(() => {
			chart?.resize();
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			chart?.dispose();
		};
	}

	function updateChart() {
		if (!chart) return;

		const data = Object.entries(words).map(([name, value]) => ({
			name,
			value,
			textStyle: {
				color: `hsl(${Math.random() * 360}deg, 70%, 50%)`
			}
		}));

		const option = {
			series: [
				{
					type: 'wordCloud',
					data,
					shape: 'circle',
					left: 'center',
					top: 'center',
					width: '90%',
					height: '90%',
					sizeRange: [minFontSize, maxFontSize],
					rotationRange: [-20, 20],
					rotationStep: 15,
					gridSize: 8,
					drawOutOfBound: false,
					textStyle: {
						fontFamily: 'Inter, system-ui, sans-serif',
						fontWeight: 'normal'
					},
					emphasis: {
						focus: 'self',
						textStyle: {
							shadowBlur: 10,
							shadowColor: 'rgba(0, 0, 0, 0.3)'
						}
					}
				}
			]
		};

		chart.setOption(option);
	}

	$effect(() => {
		if (words && chart) {
			updateChart();
		}
	});

	onMount(async () => {
		await initChart();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
