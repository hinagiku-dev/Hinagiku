<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { Button, Card } from 'flowbite-svelte';
	import { ArrowRight, Mic, Brain, GraduationCap, Github } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

	let title = $state('Hinagiku');
	let highlight = $state(0);
	let lang = language; // Use the global language store directly

	const translations = {
		en: {
			transcript: 'Real-time Transcription',
			Itanalysis: 'Intelligent Analysis',
			educational: 'Educational Focus',
			tr_details:
				'Capture every valuable insight from your discussions with our advanced speech-to-text technology.',
			ia_details:
				'Get AI-powered insights and suggestions to improve discussion quality and participation.',
			ef_details:
				'Purpose-built for educational environments with features that support meaningful learning.',
			Ai_describe:
				'Our AI-powered system emphasizes student-led discussions while providing structured guidance, making it easier for teachers to direct learning and analyze outcomes.',
			intro:
				'Hinagiku helps educators facilitate more engaging and productive discussions through real-time transcription and intelligent analysis.',
			welcome: 'Welcome to Hinagiku!',
			profile: 'Profile',
			dashboard: 'Go to Dashboard',
			signOut: 'Sign out',
			login: 'Login',
			started: 'Get Started',
			learn: 'Learn More',
			whyChoose: 'Why Choose Hinagiku?',
			whyChooseDesc:
				'Our platform combines cutting-edge technology with educational expertise to enhance learning outcomes.',
			howItWorks: 'How It Works',
			howItWorksDesc:
				'Hinagiku enhances the Think-Pair-Share learning technique with AI assistance throughout the entire process.',
			preparation: '1. Preparation',
			preparationDesc:
				'Teachers create discussion templates and set up dynamic timelines for structured learning sessions.',
			joinSession: '2. Join Session',
			joinSessionDesc:
				'Students easily join discussions by scanning a session QR code, then form or join groups.',
			discussion: '3. Discussion',
			discussionDesc:
				'AI assists in guiding individual reflection, group discussions, and helps maintain focus on the topic.',
			analysis: '4. Analysis',
			analysisDesc:
				'Get visual summaries and insights from discussions to understand class perspectives and engagement.',
			communityDriven: 'Community-Driven Templates',
			communityDrivenDesc:
				'Access and share discussion templates with educators worldwide. Build upon proven discussion frameworks or contribute your own.',
			browseTemplates: 'Browse public templates from experienced educators',
			forkTemplates: 'Fork and customize existing templates for your needs',
			shareTemplates: 'Share your successful discussion formats with the community',
			collaborateTemplates: 'Collaborate with other educators to improve templates',
			exploreTemplates: 'Explore Templates',
			storyBehind: 'The Story Behind Our Name',
			storyBehindDesc:
				'Hinagiku (雛菊), or Daisy in English, is an intelligent system designed to support discussions in educational environments.',
			realTime:
				"One of Hinagiku's key features is its real-time voice transcription and analysis, which helps hosts provide timely and insightful feedback, setting it apart from other educational tools.",
			coreValues:
				'We chose the name Hinagiku because it reflects our core values: resilience, simplicity, and growth—much like the daisy flower itself, which flourishes in diverse conditions.',
			mission:
				'Our mission is to help participants and hosts connect meaningfully by providing tools that facilitate better communication and collaboration in classrooms.',
			openSource: 'Open Source',
			openSourceDesc:
				'Hinagiku is open source and available on GitHub. We welcome contributions from the community!',
			viewOnGitHub: 'View on GitHub'
		},
		zh: {
			transcript: '即時轉錄',
			Itanalysis: '智慧分析',
			educational: '教育焦點',
			tr_details: '使用我們先進的語音轉文字技術捕獲討論中的每一個寶貴見解。',
			ia_details: '獲取AI提供的見解和建議，以提高討論品質和參與度。',
			ef_details: '專為教育環境而設計，具被助於有效學習的功能。',
			Ai_describe:
				'我們的AI系統強調學生主導的討論，同時提供結構化指導，使教師更容易引導學習並分析結果。',
			intro: 'Hinagiku透過即時轉錄和智慧分析幫助教育工作者促進更具吸引力和生產力的討論。',
			welcome: '歡迎來到Hinagiku!',
			profile: '個人资料',
			dashboard: '儀表板',
			signOut: '登出',
			login: '登入',
			started: '開始使用',
			learn: '了解更多',
			whyChoose: '為什麼選擇Hinagiku？',
			whyChooseDesc: '我們的平台結合了尖端技術和教育專業知識，以提高學習成果。',
			howItWorks: '它是如何工作的',
			howItWorksDesc: 'Hinagiku在整個過程中通過AI輔助增強了Think-Pair-Share學習技術。',
			preparation: '1. 準備',
			preparationDesc: '教師創建討論模板並設置動態時間表以進行結構化學習會話。',
			joinSession: '2. 加入會話',
			joinSessionDesc: '學生通過掃描會話二維碼輕鬆加入討論，然後組建或加入小組。',
			discussion: '3. 討論',
			discussionDesc: 'AI協助指導個人反思、小組討論，並幫助保持對主題的關注。',
			analysis: '4. 分析',
			analysisDesc: '從討論中獲取視覺摘要和見解，以了解班級的觀點和參與度。',
			communityDriven: '社區驅動的模板',
			communityDrivenDesc:
				'訪問並分享來自全球教育工作者的討論模板。在經過驗證的討論框架上進行構建或貢獻您自己的模板。',
			browseTemplates: '瀏覽來自經驗豐富的教育工作者的公共模板',
			forkTemplates: '分叉並自定義現有模板以滿足您的需求',
			shareTemplates: '與社區分享您成功的討論格式',
			collaborateTemplates: '與其他教育工作者合作改進模板',
			exploreTemplates: '探索模板',
			storyBehind: '我們名字背後的故事',
			storyBehindDesc:
				'Hinagiku（雛菊），或英文中的Daisy，是一個旨在支持教育環境中討論的智能系統。',
			realTime:
				'Hinagiku的一個關鍵功能是其實時語音轉錄和分析，這有助於主持人提供及時和有見地的反饋，使其與其他教育工具區分開來。',
			coreValues:
				'我們選擇Hinagiku這個名字是因為它反映了我們的核心價值觀：韌性、簡單和成長——就像雛菊花一樣，在不同的條件下茁壯成長。',
			mission: '我們的使命是通過提供促進更好溝通和協作的工具，幫助參與者和主持人有意義地聯繫。',
			openSource: '開源',
			openSourceDesc: 'Hinagiku是開源的，並在GitHub上可用。我們歡迎社區的貢獻！',
			viewOnGitHub: '在GitHub上查看'
		}
	};

	onMount(() => {
		const interval = setInterval(() => {
			let newHighlight;
			do {
				newHighlight = Math.floor(Math.random() * title.length);
			} while (newHighlight === highlight);
			highlight = newHighlight;
		}, 800);

		return () => clearInterval(interval);
	});
	//for i18n support
	// import * as m from '$lib/paraglide/messages.js'
	// import { languageTag } from '$lib/paraglide/runtime.js'
</script>

<svelte:head>
	<title>Home | Hinagiku</title>
</svelte:head>

<main class="min-h-screen">
	<div class="bg-gradient-to-b from-primary-50 to-white">
		<div class="mx-auto max-w-6xl px-4 py-24">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div class="text-left">
					<h1 class="mb-6 font-bold leading-tight">
						<span class="mb-4 block text-2xl text-gray-900"
							>Transform Educational Discussions with</span
						>
						<span class="text-8xl text-gray-500">
							{#each title as c, i}
								<span
									class="transition-colors duration-500"
									class:text-primary-600={i === highlight}>{c}</span
								>
							{/each}
						</span>
					</h1>
					<p class="mb-8 text-xl text-gray-600">
						{translations[$lang].intro}
					</p>
					<div class="flex gap-4">
						{#if $user}
							<Button size="xl" class="gap-2" href="/dashboard">
								{translations[$lang].dashboard}
								<ArrowRight size={20} />
							</Button>
						{:else}
							<Button size="xl" class="gap-2" href="/login">
								{translations[$lang].started}
								<ArrowRight size={20} />
							</Button>
							<Button size="xl" color="light" href="#features">{translations[$lang].learn}</Button>
						{/if}
					</div>
				</div>
				<div class="hidden lg:block">
					<img src="/home.webp" alt="Educational Discussion" class="w-full" />
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div id="features" class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{translations[$lang].whyChoose}</h2>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					{translations[$lang].whyChooseDesc}
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Mic class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].transcript}</h3>
					<p class="text-gray-600">
						{translations[$lang].tr_details}
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<Brain class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].Itanalysis}</h3>
					<p class="text-gray-600">
						{translations[$lang].ia_details}
					</p>
				</Card>

				<Card class="text-center">
					<div class="mb-4 flex justify-center">
						<div class="rounded-full bg-primary-100 p-3">
							<GraduationCap class="h-6 w-6 text-primary-600" />
						</div>
					</div>
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].educational}</h3>
					<p class="text-gray-600">
						{translations[$lang].ef_details}
					</p>
				</Card>
			</div>
		</div>
	</div>

	<!-- Workflow Section -->
	<div class="bg-gradient-to-b from-white via-primary-50/30 to-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{translations[$lang].howItWorks}</h2>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					{translations[$lang].howItWorksDesc}
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-4">
				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].preparation}</h3>
					<p class="text-gray-600">
						{translations[$lang].preparationDesc}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].joinSession}</h3>
					<p class="text-gray-600">
						{translations[$lang].joinSessionDesc}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].discussion}</h3>
					<p class="text-gray-600">
						{translations[$lang].discussionDesc}
					</p>
				</Card>

				<Card class="text-center">
					<h3 class="mb-3 text-xl font-semibold">{translations[$lang].analysis}</h3>
					<p class="text-gray-600">
						{translations[$lang].analysisDesc}
					</p>
				</Card>
			</div>

			<div class="mt-12 text-center">
				<p class="mx-auto max-w-2xl text-gray-600">
					{translations[$lang].Ai_describe}
				</p>
			</div>
		</div>
	</div>

	<!-- Template Community Section -->
	<div class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div>
					<h2 class="mb-6 text-3xl font-bold text-gray-900">
						{translations[$lang].communityDriven}
					</h2>
					<div class="space-y-4 text-gray-600">
						<p class="text-xl">
							{translations[$lang].communityDrivenDesc}
						</p>
						<ul class="ml-6 list-disc space-y-3">
							<li>{translations[$lang].browseTemplates}</li>
							<li>{translations[$lang].forkTemplates}</li>
							<li>{translations[$lang].shareTemplates}</li>
							<li>{translations[$lang].collaborateTemplates}</li>
						</ul>
						<div class="mt-8">
							<Button size="xl" class="gap-2" href="/templates/public">
								{translations[$lang].exploreTemplates}
								<ArrowRight size={20} />
							</Button>
						</div>
					</div>
				</div>
				<div class="hidden lg:block">
					<img
						src="/templates-preview.webp"
						alt="Discussion Templates"
						class="w-full rounded-lg shadow-lg"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Story Behind Our Name section -->
	<div class="bg-gradient-to-b from-white via-primary-50/30 to-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="grid items-center gap-12 lg:grid-cols-2">
				<div class="order-2 lg:order-1">
					<img
						src="/daisy-illustration.webp"
						alt="Hinagiku Daisy"
						class="mx-auto max-w-md rounded-lg shadow-lg"
					/>
				</div>
				<div class="order-1 lg:order-2">
					<h2 class="mb-6 text-3xl font-bold text-gray-900">{translations[$lang].storyBehind}</h2>
					<div class="space-y-4 text-gray-600">
						<p>
							<span class="font-semibold text-primary-600">Hinagiku (雛菊)</span>, {translations[
								$lang
							].storyBehindDesc}
						</p>
						<p>
							{translations[$lang].realTime}
						</p>
						<p>
							{translations[$lang].coreValues}
						</p>
						<p>
							{translations[$lang].mission}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- GitHub Section -->
	<div class="bg-white py-24">
		<div class="mx-auto max-w-6xl px-4">
			<div class="text-center">
				<h2 class="mb-4 text-3xl font-bold text-gray-900">{translations[$lang].openSource}</h2>
				<p class="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
					{translations[$lang].openSourceDesc}
				</p>
				<Button
					size="xl"
					class="gap-2"
					href="https://github.com/hinagiku-dev/Hinagiku"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Github />
					{translations[$lang].viewOnGitHub}
				</Button>
			</div>
		</div>
	</div>
</main>
