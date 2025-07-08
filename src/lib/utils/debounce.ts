/**
 * Debounce Utility Function
 * 
 * This module provides a debounce utility that delays function execution until
 * after a specified wait period has elapsed since the last time it was invoked.
 * This is essential for optimizing performance in scenarios with frequent events
 * like user input, API calls, or real-time updates.
 * 
 * Common Use Cases:
 * - Search input handling to avoid excessive API calls
 * - Window resize event optimization
 * - Button click protection against rapid succession
 * - Auto-save functionality with user input
 * 
 * @fileoverview Function debouncing utility for performance optimization
 */

/**
 * Creates a debounced version of the provided function that delays its execution
 * until after the specified wait time has passed since the last invocation.
 * 
 * The debounced function will:
 * - Cancel any pending execution when called again within the wait period
 * - Execute with the most recent arguments after the wait period
 * - Preserve the original function's context (this binding)
 * - Maintain type safety with TypeScript generics
 * 
 * @template T - The type of the function to debounce
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay execution
 * @returns A debounced version of the function
 * 
 * @example
 * ```ts
 * // Debounce search input to avoid excessive API calls
 * const searchUsers = debounce(async (query: string) => {
 *   const results = await fetch(`/api/search?q=${query}`);
 *   updateSearchResults(results);
 * }, 300);
 * 
 * // Use in input handler
 * searchInput.addEventListener('input', (e) => {
 *   searchUsers(e.target.value); // Only calls API after 300ms of no typing
 * });
 * ```
 * 
 * @example
 * ```ts
 * // Debounce auto-save functionality
 * const autoSave = debounce((content: string) => {
 *   localStorage.setItem('draft', content);
 *   console.log('Draft saved!');
 * }, 1000);
 * 
 * // Call on every keystroke, but only saves after 1 second of inactivity
 * textArea.addEventListener('input', (e) => {
 *   autoSave(e.target.value);
 * });
 * ```
 */
export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;
	
	return function (this: unknown, ...args: Parameters<T>) {
		// Clear any existing timeout to reset the delay
		clearTimeout(timeout);
		
		// Set a new timeout to execute the function after the wait period
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}
