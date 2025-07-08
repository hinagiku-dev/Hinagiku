<!--
@fileoverview
Theme management component for the Hinagiku educational platform.

This component handles dynamic color theme application based on deployment
configuration. It provides a flexible theming system that allows different
deployments to customize the visual appearance while maintaining design
consistency.

Features:
- Dynamic CSS custom property injection for color themes
- Automatic color shade generation for complete color palettes
- Smart application that only overrides when colors differ from defaults
- Support for both primary and secondary color customization
- Hex to RGB conversion utilities for color manipulation
- Shade variation generation for consistent design systems
- Browser-safe color application with proper validation

The component runs invisibly in the background, applying custom colors
from the deployment configuration to CSS custom properties that are
used throughout the application's design system.

The theming system generates complete color palettes from base colors,
including lighter and darker shades for hover states, backgrounds,
borders, and other UI elements.
-->

<script lang="ts">
	import { onMount } from 'svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import { browser } from '$app/environment';

	/** Default primary color for comparison and fallback */
	const DEFAULT_PRIMARY_COLOR = '#FE795D';
	
	/** Default secondary color for comparison and fallback */
	const DEFAULT_SECONDARY_COLOR = '#10b981';

	/**
	 * Converts a hex color string to RGB values.
	 * 
	 * @param hex - Hex color string (with or without #)
	 * @returns RGB object with r, g, b values or null if invalid
	 */
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

	/**
	 * Generates a complete color palette with various shade variations.
	 * 
	 * Creates a range of color shades from light to dark based on a base color,
	 * providing a consistent design system for UI elements.
	 * 
	 * @param baseColor - Base hex color for palette generation
	 * @returns Object mapping shade numbers to color values
	 */
	function generateColorShades(baseColor: string): Record<number, string> {
		const rgb = hexToRgb(baseColor);
		if (!rgb) return {};

		const { r, g, b } = rgb;

		return {
			50: `rgba(${r}, ${g}, ${b}, 0.05)`,   // Very light
			100: `rgba(${r}, ${g}, ${b}, 0.1)`,   // Light
			200: `rgba(${r}, ${g}, ${b}, 0.2)`,   // Lighter
			300: `rgba(${r}, ${g}, ${b}, 0.3)`,   // Light medium
			400: `rgba(${r}, ${g}, ${b}, 0.4)`,   // Medium
			500: baseColor,                       // Original color
			600: shadeColor(baseColor, -10),      // Darker
			700: shadeColor(baseColor, -20),      // Even darker
			800: shadeColor(baseColor, -30),      // Much darker
			900: shadeColor(baseColor, -40)       // Very dark
		};
	}

	/**
	 * Darkens or lightens a color by a given percentage.
	 * 
	 * @param color - Base hex color
	 * @param percent - Percentage to adjust (-100 to 100, negative for darker)
	 * @returns Adjusted color as RGB string
	 */
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

	/**
	 * Applies custom theme colors to CSS custom properties.
	 * 
	 * Only applies colors that differ from the default theme to avoid
	 * unnecessary style overrides. Sets CSS custom properties on the
	 * document root for global access throughout the application.
	 */
	function applyThemeColors(): void {
		if (!browser) return;

		const root = document.documentElement;

		// Apply primary color if customized
		if (deploymentConfig.primaryColor.toLowerCase() !== DEFAULT_PRIMARY_COLOR.toLowerCase()) {
			console.log('Applying custom primary color');
			const primaryShades = generateColorShades(deploymentConfig.primaryColor);
			for (const [shade, color] of Object.entries(primaryShades)) {
				root.style.setProperty(`--color-primary-${shade}`, color);
			}
		}

		// Apply secondary color if customized
		if (deploymentConfig.secondaryColor.toLowerCase() !== DEFAULT_SECONDARY_COLOR.toLowerCase()) {
			console.log('Applying custom secondary color');
			const secondaryShades = generateColorShades(deploymentConfig.secondaryColor);
			for (const [shade, color] of Object.entries(secondaryShades)) {
				root.style.setProperty(`--color-secondary-${shade}`, color);
			}
		}

		// Log applied theme configuration for debugging
		console.log('Theme colors:', {
			primary: deploymentConfig.primaryColor,
			secondary: deploymentConfig.secondaryColor,
			usingDefaultPrimary:
				deploymentConfig.primaryColor.toLowerCase() === DEFAULT_PRIMARY_COLOR.toLowerCase(),
			usingDefaultSecondary:
				deploymentConfig.secondaryColor.toLowerCase() === DEFAULT_SECONDARY_COLOR.toLowerCase()
		});
	}

	// Apply theme colors when component mounts
	onMount(() => {
		applyThemeColors();
	});
</script>

<!-- This is an invisible component that just applies theme colors -->
<div class="hidden"></div>
