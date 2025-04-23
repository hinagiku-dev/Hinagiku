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
	let dvdColors = [
		'#ff0000', // red
		'#00ff00', // green
		'#0000ff', // blue
		'#ffff00', // yellow
		'#ff00ff', // magenta
		'#00ffff', // cyan
		'#ff8000', // orange
		'#8000ff' // purple
	];
	let currentColorIndex = 0;
	let textColor = dvdColors[0];

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

		// Set up resize listener
		window.addEventListener('resize', updateDimensions);

		// Set initial position
		x = Math.random() * ((window.innerWidth || 1024) - 300);
		y = Math.random() * ((window.innerHeight || 768) - 100);

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

		window.removeEventListener('resize', updateDimensions);
		stopAnimation();
		unsubAnnouncement();
	});

	// Update window dimensions for animation boundaries
	function updateDimensions() {
		if (!browser || !container || !textElement) return;

		containerWidth = window.innerWidth;
		containerHeight = window.innerHeight;
		textWidth = textElement.offsetWidth;
		textHeight = textElement.offsetHeight;

		// Keep in bounds
		x = Math.min(x, containerWidth - textWidth);
		y = Math.min(y, containerHeight - textHeight);
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

		// Set random starting position if not already set
		if (x === 0 && y === 0) {
			x = Math.floor(
				Math.random() * ((containerWidth || window.innerWidth || 1024) - (textWidth || 100))
			);
			y = Math.floor(
				Math.random() * ((containerHeight || window.innerHeight || 768) - (textHeight || 50))
			);
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
		announcementData.color = textColor;
	}

	// Handle user dismissing the announcement
	function handleDismiss() {
		announcement.dismiss();
	}
</script>

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
				style="transform: translate({x}px, {y}px); color: {announcementData.color}; background-color: rgba(0, 0, 0, 0.8); border: 2px solid {announcementData.color};"
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
