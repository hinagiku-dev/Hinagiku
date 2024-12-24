<script lang="ts">
	import * as echarts from 'echarts';
	import { onDestroy, onMount } from 'svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import { getUser } from '$lib/utils/getUser';
	import { countWords } from '$lib/utils/countWords';
	import type { Conversation } from '$lib/schema/conversation';

	type PartialConversation = Pick<Conversation, 'userId' | 'history'>;
	let { conversations = [] }: { conversations?: PartialConversation[] } = $props();

	let chart: echarts.EChartsType;
	let container: HTMLElement;

	// Add user name mapping store
	let userNames = new Map<string, string>();
	let loading = true;

	function getColorByRatio(ratio: number): string {
		const h = 12;
		const s = 86;
		const l = Math.max(40, 80 - ratio * 34); // lightness varies from 56% to 80%
		return `hsl(${h}, ${s}%, ${l}%)`;
	}

	async function updateChart() {
		if (!container) return;

		if (!chart) {
			chart = echarts.init(container);
		}

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
		loading = true;

		await Promise.all(
			userIds.map(async (uid) => {
				if (!userNames.has(uid)) {
					const profile = await getUser(uid);
					userNames.set(uid, profile.displayName);
				}
			})
		);

		loading = false;

		const sortedData = Object.entries(participantData)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.reverse();

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
		if (innerWidth.current && chart) {
			chart.resize();
		}
	});

	$effect(() => {
		if (!loading && conversations && chart) {
			updateChart();
		}
	});

	onMount(() => {
		updateChart();
	});

	onDestroy(() => {
		chart?.dispose();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
