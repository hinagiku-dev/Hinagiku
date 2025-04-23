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
	import { page } from '$app/state';
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

	// Handle host detection within onMount
	onMount(() => {
		log('DEBUG: Component mounted, checking for session data');

		// Get user ID from auth store
		const userUnsubscribe = authUser.subscribe((user) => {
			if (user?.uid) {
				currentUserId = user.uid;
				log('DEBUG: Auth user detected, userId =', currentUserId);

				// Check if user is host based on session data
				checkHostStatus();
			}
		});

		// Clean up subscription
		onDestroy(userUnsubscribe);
	});

	function checkHostStatus() {
		log('DEBUG: checkHostStatus() called, currentUserId =', currentUserId);

		if (!session || !currentUserId) {
			log(
				'DEBUG: Missing session or userId, session exists =',
				!!session,
				'userId =',
				currentUserId
			);

			// Fallback - check using page data directly
			if (browser) {
				const pageHostId = page.data?.session?.host;
				if (pageHostId) {
					isHost = pageHostId === currentUserId;
					log('DEBUG: Used page data fallback, isHost =', isHost);
				}
			}
			return;
		}

		session.subscribe((sessionData) => {
			log(
				'DEBUG: Session data received:',
				'host =',
				sessionData?.host,
				'currentUser =',
				currentUserId
			);

			if (sessionData?.host) {
				const oldHostStatus = isHost;
				isHost = sessionData.host === currentUserId;

				log(
					'DEBUG: Host check result:',
					'oldStatus =',
					oldHostStatus,
					'newStatus =',
					isHost,
					'match =',
					sessionData.host === currentUserId
				);

				// Log host status changes for debugging
				if (oldHostStatus !== isHost) {
					log(`Host status: ${isHost}`, 'User:', currentUserId, 'Session host:', sessionData.host);
				}

				// Stop animation immediately if we're a host
				if (isHost && animationActive) {
					log('DEBUG: Stopping animation because user is host');
					stopAnimation();
				}
			}

			return () => {}; // Return unsubscribe function
		});
	}

	let announcementData: Announcement | null = $state(null);
	const announcementUnsubscribe = announcement.subscribe((value) => {
		log('DEBUG: Announcement data received:', value);

		// Only update if the value actually changed
		if (JSON.stringify(announcementData) !== JSON.stringify(value)) {
			announcementData = value;

			// Start animation if not a host and we have announcement data
			if (browser && announcementData && !isHost && !animationActive) {
				// Use setTimeout to ensure component is fully mounted
				setTimeout(() => {
					if (container && textElement) {
						startAnimation();
					} else {
						log('DEBUG: Delaying animation start - DOM elements not ready yet');
						// Schedule another check
						ensureAnimationRunning();
					}
				}, 100);
			}
		}
		return () => announcementUnsubscribe();
	});

	let xSpeed = 2;
	let ySpeed = 2;
	let x = $state(0);
	let y = $state(0);
	let textWidth = $state(0);
	let textHeight = $state(0);
	let containerWidth = $state(0);
	let containerHeight = $state(0);
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

	function updateDimensions() {
		if (!browser || !container || !textElement) return;

		containerWidth = window.innerWidth;
		containerHeight = window.innerHeight;
		textWidth = textElement.offsetWidth;
		textHeight = textElement.offsetHeight;

		// Make sure the DVD logo doesn't go offscreen on resize
		x = Math.min(x, containerWidth - textWidth);
		y = Math.min(y, containerHeight - textHeight);
	}

	function animate() {
		// Don't animate if host or missing resources
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

		// Update positions
		x += xSpeed;
		y += ySpeed;

		// Check boundaries and bounce
		if (x <= 0 || x + textWidth >= containerWidth) {
			xSpeed = -xSpeed;
			changeColor();

			// Adjust position to prevent getting stuck
			if (x <= 0) x = 1;
			if (x + textWidth >= containerWidth) x = containerWidth - textWidth - 1;
		}

		if (y <= 0 || y + textHeight >= containerHeight) {
			ySpeed = -ySpeed;
			changeColor();

			// Adjust position to prevent getting stuck
			if (y <= 0) y = 1;
			if (y + textHeight >= containerHeight) y = containerHeight - textHeight - 1;
		}

		// Apply position if DOM elements exist
		if (textElement) {
			textElement.style.transform = `translate(${x}px, ${y}px)`;
		}

		// Continue animation only if we're not a host and have active animation
		if (browser && animationActive && !isHost) {
			animationId = requestAnimationFrame(animate);
		} else {
			log('DEBUG: Animation loop exited:', {
				browser: !browser ? 'Not in browser' : null,
				active: !animationActive ? 'Not active' : null,
				host: isHost ? 'Is host' : null
			});
			stopAnimation();
		}
	}

	function startAnimation() {
		if (animationActive) {
			log('DEBUG: Animation already active, not starting again');
			return;
		}

		log('DEBUG: Starting animation, isHost =', isHost);
		animationActive = true;

		// Use random position if not set
		if (x === 0 && y === 0) {
			x = Math.floor(
				Math.random() * ((containerWidth || window.innerWidth || 1024) - (textWidth || 100))
			);
			y = Math.floor(
				Math.random() * ((containerHeight || window.innerHeight || 768) - (textHeight || 50))
			);
		}

		// Ensure color is set
		if (!textColor) changeColor();

		// Schedule the first animation frame
		animationId = requestAnimationFrame(animate);
	}

	function stopAnimation() {
		if (!animationActive) return;

		log('DEBUG: Stopping animation');
		if (animationId !== null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		animationActive = false;
	}

	function changeColor() {
		if (!announcementData) return;

		currentColorIndex = (currentColorIndex + 1) % dvdColors.length;
		textColor = dvdColors[currentColorIndex];
		announcementData.color = textColor;
	}

	function handleDismiss() {
		announcement.dismiss();
	}

	// Initialize dimensions with default values for SSR
	function initializeDimensions() {
		// Set safe default values for SSR
		containerWidth = 1024; // Default width
		containerHeight = 768; // Default height
		x = 100;
		y = 100;
	}

	// Call this initially for SSR
	initializeDimensions();

	// Set up a ticker to ensure animation keeps running
	let tickerId: number | null = null;

	function ensureAnimationRunning() {
		if (!browser || isHost) return;

		if (announcementData && !animationActive) {
			log('DEBUG: Ticker ensuring animation is running');
			// Start animation only if DOM elements are ready
			if (container && textElement) {
				startAnimation();
			} else {
				log('DEBUG: DOM elements not ready yet in ticker');
			}
		}
	}

	onMount(() => {
		if (!browser) return;

		log('DEBUG: Component mounted, setting up animation');
		window.addEventListener('resize', updateDimensions);

		// Start with random positions
		x = Math.random() * ((window.innerWidth || 1024) - 300);
		y = Math.random() * ((window.innerHeight || 768) - 100);

		// Set up a ticker to ensure animation keeps running (with a slight delay to ensure DOM is ready)
		setTimeout(() => {
			log('DEBUG: Setting up animation ticker');
			tickerId = window.setInterval(ensureAnimationRunning, 1000);

			// Initialize the animation after dimensions are available
			if (!isHost && announcementData) {
				updateDimensions();
				if (container && textElement) {
					startAnimation();
				} else {
					log('DEBUG: DOM elements not ready at initial animation');
				}
			}
		}, 500);
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('resize', updateDimensions);
		stopAnimation();

		if (tickerId !== null) {
			window.clearInterval(tickerId);
		}
	});

	// Force animation restart when all needed elements are available
	$effect(() => {
		// Only run in browser and for non-hosts
		if (!browser || isHost) return;

		// When we have announcement data, DOM elements, and animation is not active, start it
		if (announcementData && container && textElement && !animationActive) {
			log('DEBUG: Effect detected all elements ready, starting animation');

			// Reset positions and ensure valid dimensions
			updateDimensions();
			if (containerWidth <= 0 || containerHeight <= 0) {
				containerWidth = window.innerWidth || 1024;
				containerHeight = window.innerHeight || 768;
			}

			// Make sure text position is valid
			x = Math.min(Math.max(0, x), containerWidth - (textWidth || 100));
			y = Math.min(Math.max(0, y), containerHeight - (textHeight || 50));

			// Start with fresh animation frame
			startAnimation();
		}
	});

	// Ensure proper cleanup on isHost change
	$effect(() => {
		if (isHost && animationActive) {
			log('DEBUG: User became host, stopping animation');
			stopAnimation();
		}
	});

	// Handle announcement data changes
	$effect(() => {
		log('DEBUG: Current isHost state =', isHost);
		log('DEBUG: Current announcementData =', announcementData);
		log(
			'DEBUG: Animation state =',
			'active:',
			animationActive,
			'DOM ready:',
			!!container && !!textElement
		);
		log('DEBUG: Should show announcement =', !isHost && !!announcementData);
	});
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
