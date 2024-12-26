<script lang="ts">
	import * as echarts from 'echarts';
	import { onMount } from 'svelte';
	import { getUser } from '$lib/utils/getUser';
	import { countWords } from '$lib/utils/countWords';
	import type { Conversation } from '$lib/schema/conversation';

	type PartialConversation = Pick<Conversation, 'userId' | 'history'>;
	let { conversations = [] }: { conversations?: PartialConversation[] } = $props();

	let chart: echarts.EChartsType | null = $state(null);
	let container: HTMLDivElement | null = $state(null);

	// Add user name mapping store
	let userNames = new Map<string, string>();

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
		if (!chart || !conversations || conversations.length === 0) return;

		const participantData = conversations.reduce(
			(acc, conv) => {
				const userMessages = conv.history.filter((msg) => msg.role === 'user');
				const wordCount = userMessages.reduce((sum, msg) => sum + countWords(msg.content), 0);

				if (!acc[conv.userId]) {
					acc[conv.userId] = 0;
				}
				acc[conv.userId] += wordCount;
				return acc;
			},
			{} as Record<string, number>
		);

		// Load user profiles if not cached
		const userIds = Object.keys(participantData);

		await Promise.all(
			userIds.map(async (uid) => {
				if (!userNames.has(uid)) {
					const profile = await getUser(uid);
					userNames.set(uid, profile.displayName);
				}
			})
		);

		const sortedData = Object.entries(participantData)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.reverse();
		console.log('sortedData', sortedData);
		const maxValue = sortedData[sortedData.length - 1][1];

		chart.setOption({
			title: {
				text: 'Most Active Participants',
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
				data: sortedData.map(([id]) => userNames.get(id) || id),
				axisLabel: {
					interval: 0
				}
			},
			series: [
				{
					type: 'bar',
					data: sortedData.map(([, count]) => count),
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
		if (conversations && conversations.length > 0) {
			updateChart();
		}
	});

	onMount(async () => {
		await initChart();
	});
</script>

<div bind:this={container} class="h-full w-full">
	{#if !conversations || conversations.length === 0}
		<div class="flex h-full w-full items-center justify-center text-gray-500">暫無數據</div>
	{/if}
</div>
