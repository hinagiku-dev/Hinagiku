<script lang="ts">
	import { onMount } from 'svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import { browser } from '$app/environment';

	// Default color values
	const DEFAULT_PRIMARY_COLOR = '#FE795D';
	const DEFAULT_SECONDARY_COLOR = '#10b981';

	// Utility to convert hex to RGB
	function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16)
				}
			: null;
	}

	// Generate shade variations of a color
	function generateColorShades(baseColor: string): Record<number, string> {
		const rgb = hexToRgb(baseColor);
		if (!rgb) return {};

		const { r, g, b } = rgb;

		return {
			50: `rgba(${r}, ${g}, ${b}, 0.05)`,
			100: `rgba(${r}, ${g}, ${b}, 0.1)`,
			200: `rgba(${r}, ${g}, ${b}, 0.2)`,
			300: `rgba(${r}, ${g}, ${b}, 0.3)`,
			400: `rgba(${r}, ${g}, ${b}, 0.4)`,
			500: baseColor, // Original color
			600: shadeColor(baseColor, -10), // Darker
			700: shadeColor(baseColor, -20), // Even darker
			800: shadeColor(baseColor, -30), // Much darker
			900: shadeColor(baseColor, -40) // Very dark
		};
	}

	// Utility to darken or lighten a color
	function shadeColor(color: string, percent: number): string {
		const rgb = hexToRgb(color);
		if (!rgb) return color;

		let { r, g, b } = rgb;

		// Calculate the new RGB values based on percentage
		r = Math.max(0, Math.min(255, r + (r * percent) / 100));
		g = Math.max(0, Math.min(255, g + (g * percent) / 100));
		b = Math.max(0, Math.min(255, b + (b * percent) / 100));

		return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
	}

	// Apply theme colors to CSS variables only if they differ from defaults
	function applyThemeColors(): void {
		if (!browser) return;

		const root = document.documentElement;

		// Only apply primary color if it's different from default
		if (deploymentConfig.primaryColor.toLowerCase() !== DEFAULT_PRIMARY_COLOR.toLowerCase()) {
			console.log('Applying custom primary color');
			const primaryShades = generateColorShades(deploymentConfig.primaryColor);
			for (const [shade, color] of Object.entries(primaryShades)) {
				root.style.setProperty(`--color-primary-${shade}`, color);
			}
		}

		// Only apply secondary color if it's different from default
		if (deploymentConfig.secondaryColor.toLowerCase() !== DEFAULT_SECONDARY_COLOR.toLowerCase()) {
			console.log('Applying custom secondary color');
			const secondaryShades = generateColorShades(deploymentConfig.secondaryColor);
			for (const [shade, color] of Object.entries(secondaryShades)) {
				root.style.setProperty(`--color-secondary-${shade}`, color);
			}
		}

		// Log applied colors
		console.log('Theme colors:', {
			primary: deploymentConfig.primaryColor,
			secondary: deploymentConfig.secondaryColor,
			usingDefaultPrimary:
				deploymentConfig.primaryColor.toLowerCase() === DEFAULT_PRIMARY_COLOR.toLowerCase(),
			usingDefaultSecondary:
				deploymentConfig.secondaryColor.toLowerCase() === DEFAULT_SECONDARY_COLOR.toLowerCase()
		});
	}

	onMount(() => {
		applyThemeColors();
	});
</script>

<!-- This is an invisible component that just applies theme colors -->
<div class="hidden"></div>
