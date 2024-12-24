<script lang="ts">
	import WordCloud from '$lib/components/session/WordCloud.svelte';
	import MostActiveGroups from '$lib/components/session/MostActiveGroups.svelte';
	import MostActiveParticipants from '$lib/components/session/MostActiveParticipants.svelte';

	const wordCloudData = {
		中文: 150,
		英文: 145,
		學習: 140,
		討論: 130,
		語言: 120,
		溝通: 110,
		練習: 100,
		口說: 95,
		聽力: 90,
		文法: 85,
		English: 80,
		單字: 75,
		會話: 70,
		交流: 65,
		發音: 60,
		寫作: 55,
		閱讀: 50
	};

	const sampleTexts = [
		'今天的討論主題很有趣，我們來聊聊語言學習的經驗吧！',
		'我覺得多看台灣的影集對學習中文很有幫助。',
		'大家都很認真參與討論，讓我學到很多。',
		'說中文的時候要注意聲調，這是很重要的部分。',
		'This is a sample discussion in English.',
		'我們應該多練習口說，這樣才能提升實際溝通能力。'
	];

	const groupsData = Array.from({ length: 8 }, (_, i) => ({
		number: i + 1,
		discussions: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, () => ({
			id: null,
			content: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
			speaker: '',
			audio: null
		}))
	}));

	const conversationsData = Array.from({ length: 8 }, (_, i) => ({
		userId: `user${i + 1}`,
		history: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, () => ({
			role: 'user' as const,
			content: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
			audio: null
		}))
	}));
</script>

<div class="grid h-screen grid-cols-2 gap-4 p-4">
	<div class="col-span-2 h-[400px] rounded-lg bg-white p-4 shadow">
		<WordCloud words={wordCloudData} />
	</div>
	<div class="h-[400px] rounded-lg bg-white p-4 shadow">
		<MostActiveGroups groups={groupsData} />
	</div>
	<div class="h-[400px] rounded-lg bg-white p-4 shadow">
		<MostActiveParticipants conversations={conversationsData} />
	</div>
</div>
