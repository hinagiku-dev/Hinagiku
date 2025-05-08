/**
 * UI Configuration Variables
 * This file centralizes UI-related configuration variables that can be reused across components.
 * Import this file in components that need to use these values.
 */

// For custom Tailwind classes that use CSS variables
export const UI_CLASSES = {
	// Use this class for panel backgrounds to maintain consistent transparency
	// This gets the transparency value from the CSS variable in app.css
	PANEL_BG: 'bg-white/[var(--panel-bg-opacity)]'
};
