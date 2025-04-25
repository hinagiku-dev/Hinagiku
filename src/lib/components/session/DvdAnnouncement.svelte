<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { announcement, type Announcement } from '$lib/stores/announcement';
	import { fly } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import { browser, dev } from '$app/environment';
	import { getContext } from 'svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import { user as authUser } from '$lib/stores/auth';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';
	import debug from 'debug';

	// Create debugger with namespace
	const log = debug('app:dvdAnnouncement');

	// Enable debug in development only
	if (browser && dev) {
		debug.enable('app:dvdAnnouncement');
	}

	// Get session from context - single source of truth
	const session = getContext<Readable<Session>>('session');
	if (!session) {
		log('WARNING: No session context found');
	}

	let isHost = $state(false);
	let currentUserId = '';

	// Animation variables
	let xSpeed = 0.8;
	let ySpeed = 0.8;
	let x = $state(0);
	let y = $state(0);
	let textWidth = $state(0);
	let textHeight = $state(0);
	let containerWidth = $state(1024);
	let containerHeight = $state(768);
	let animationActive = $state(false);
	let animationId: number | null = null;
	let container = $state<HTMLDivElement>();
	let textElement = $state<HTMLDivElement>();

	// Colors for animation
	let dvdColors = [
		'#ff0000',
		'#00ff00',
		'#0000ff',
		'#ffff00',
		'#ff00ff',
		'#00ffff',
		'#ff8000',
		'#8000ff'
	];
	let currentColorIndex = 0;
	let textColor = $state(dvdColors[0]);

	// Store the announcement data
	let announcementData: Announcement | null = $state(null);

	// Subscribe to announcement changes
	const unsubAnnouncement = announcement.subscribe((value) => {
		announcementData = value;

		// Start animation when we have data and DOM is ready
		if (browser && value && !animationActive && container && textElement && !isHost) {
			startAnimation();
		}
	});

	// Use reactive window values to update container dimensions when they change
	$effect(() => {
		// Only run when we have all required elements and the browser environment
		if (!browser || !container || !textElement) return;
		console.log('Updating container dimensions');
		console.log(innerWidth.current, innerHeight.current);

		// Explicitly depend on window dimensions
		const width = innerWidth.current;
		const height = innerHeight.current;

		// Update container dimensions
		containerWidth = Number(width || 1024);
		containerHeight = Number(height || 768);

		// Update element bounds
		updateElementDimensions();
	});

	// Check if current user is host
	onMount(() => {
		// Get user ID and check host status
		const unsubUser = authUser.subscribe((user) => {
			if (user?.uid) {
				currentUserId = user.uid;

				// Check host status via session
				const unsubSession = session.subscribe((sessionData) => {
					isHost = sessionData?.host === currentUserId;

					// Stop animation if user is host
					if (isHost && animationActive) {
						stopAnimation();
					}
				});

				return unsubSession;
			}
		});

		// Set initial position
		x = Math.random() * ((containerWidth || 1024) - 300);
		y = Math.random() * ((containerHeight || 768) - 100);

		// Start animation if conditions are met
		if (announcementData && !isHost) {
			updateDimensions();
			startAnimation();
		}

		return () => {
			if (unsubUser) unsubUser();
		};
	});

	// Clean up
	onDestroy(() => {
		if (!browser) return;

		stopAnimation();
		unsubAnnouncement();
	});

	// Update element dimensions
	function updateElementDimensions() {
		if (!browser || !textElement) return;

		textWidth = textElement.offsetWidth;
		textHeight = textElement.offsetHeight;

		// Keep in bounds
		x = Math.min(x, containerWidth - textWidth);
		y = Math.min(y, containerHeight - textHeight);
	}

	// Update all dimensions (window and element)
	function updateDimensions() {
		if (!browser || !container || !textElement) return;

		containerWidth = Number(innerWidth.current);
		containerHeight = Number(innerHeight.current);
		updateElementDimensions();
	}

	// Animation function
	function animate() {
		if (!browser || !container || !textElement || !announcementData || isHost) {
			log('DEBUG: Animation stopped due to:', {
				browser: !browser ? 'Not in browser' : null,
				container: !container ? 'No container' : null,
				textElement: !textElement ? 'No text element' : null,
				announcement: !announcementData ? 'No announcement' : null,
				host: isHost ? 'Is host' : null
			});
			stopAnimation();
			return;
		}

		// Update position
		x += xSpeed;
		y += ySpeed;

		// Bounce off edges and change color
		if (x <= 0 || x + textWidth >= containerWidth) {
			xSpeed = -xSpeed;
			changeColor();

			// Prevent getting stuck
			if (x <= 0) x = 1;
			if (x + textWidth >= containerWidth) x = containerWidth - textWidth - 1;
		}

		if (y <= 0 || y + textHeight >= containerHeight) {
			ySpeed = -ySpeed;
			changeColor();

			// Prevent getting stuck
			if (y <= 0) y = 1;
			if (y + textHeight >= containerHeight) y = containerHeight - textHeight - 1;
		}

		// Update element position
		if (textElement) {
			textElement.style.transform = `translate(${x}px, ${y}px)`;
		}

		// Continue animation
		if (browser && animationActive && !isHost) {
			animationId = requestAnimationFrame(animate);
		} else {
			stopAnimation();
		}
	}

	// Start animation
	function startAnimation() {
		if (animationActive) return;

		animationActive = true;

		// Random position if not set
		if (x === 0 && y === 0) {
			x = Math.floor(Math.random() * ((containerWidth || 1024) - (textWidth || 100)));
			y = Math.floor(Math.random() * ((containerHeight || 768) - (textHeight || 50)));
		}

		// Start animation
		animationId = requestAnimationFrame(animate);
	}

	// Stop animation
	function stopAnimation() {
		if (!animationActive) return;

		if (animationId !== null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		animationActive = false;
	}

	// Change color when bouncing
	function changeColor() {
		if (!announcementData) return;

		currentColorIndex = (currentColorIndex + 1) % dvdColors.length;
		textColor = dvdColors[currentColorIndex];
		// Don't modify announcementData as it may trigger re-renders
		// announcementData.color = textColor;
	}

	// Handle user dismissing the announcement
	function handleDismiss() {
		announcement.dismiss();
	}
</script>

<svelte:window onresize={updateDimensions} />

{#if announcementData && !isHost}
	<div
		class="pointer-events-none fixed inset-0 z-50"
		bind:this={container}
		transition:fly={{ y: -50, duration: 300 }}
	>
		<!-- Wait until both container and announcement are ready -->
		{#if container && announcementData}
			<div
				class="pointer-events-auto absolute flex items-center gap-2 rounded-lg px-6 py-3 shadow-lg"
				style="transform: translate({x}px, {y}px); color: {textColor}; background-color: rgba(0, 0, 0, 0.8); border: 2px solid {textColor};"
				bind:this={textElement}
			>
				<span class="whitespace-nowrap text-xl font-bold">{announcementData.message}</span>
				<button
					class="ml-3 rounded-full p-1 hover:bg-gray-700"
					onclick={handleDismiss}
					aria-label="Dismiss"
				>
					<X class="h-5 w-5" />
				</button>
			</div>
		{/if}
	</div>
{/if}
