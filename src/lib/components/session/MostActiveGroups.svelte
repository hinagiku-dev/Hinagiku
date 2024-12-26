<script lang="ts">
	import * as echarts from 'echarts';
	import { onMount } from 'svelte';
	import type { Group } from '$lib/schema/group';
	import { countWords } from '$lib/utils/countWords';

	type PartialGroup = Pick<Group, 'number' | 'discussions'>;
	let { groups = [] }: { groups?: PartialGroup[] } = $props();

	let chart: echarts.EChartsType | null = $state(null);
	let container: HTMLDivElement | null = $state(null);

	function getColorByRatio(ratio: number): string {
		const h = 12;
		const s = 86;
		const l = Math.max(40, 80 - ratio * 34); // lightness varies from 56% to 80%
		return `hsl(${h}, ${s}%, ${l}%)`;
	}

	async function initChart() {
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

	async function updateChart() {
		if (!chart) return;

		const groupData = groups
			.map((group) => ({
				groupNumber: group.number,
				wordCount: group.discussions.reduce((acc, disc) => acc + countWords(disc.content), 0)
			}))
			.sort((a, b) => b.wordCount - a.wordCount)
			.slice(0, 5)
			.reverse();

		const maxValue = groupData[groupData.length - 1].wordCount;

		chart.setOption({
			title: {
				text: 'Most Active Groups',
				left: 'center'
			},
			tooltip: {
				trigger: 'axis',
				formatter: '{b}: {c} words'
			},
			grid: {
				left: '15%'
			},
			xAxis: {
				type: 'value',
				name: 'Words'
			},
			yAxis: {
				type: 'category',
				data: groupData.map((g) => `Group ${g.groupNumber}`),
				axisLabel: {
					interval: 0
				}
			},
			series: [
				{
					type: 'bar',
					data: groupData.map((g) => g.wordCount),
					itemStyle: {
						color: function (params: { value: number }) {
							const ratio = params.value / maxValue;
							return getColorByRatio(ratio);
						}
					}
				}
			]
		});
	}

	$effect(() => {
		if (groups && chart) {
			updateChart();
		}
	});

	onMount(async () => {
		await initChart();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
