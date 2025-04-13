<script lang="ts">
	import { deploymentConfig } from '$lib/config/deployment';

	/**
	 * The page name to show (e.g., "Dashboard", "Settings", etc.)
	 */
	export let page: string = '';

	/**
	 * Whether to use the separator or not
	 */
	export let separator: boolean = true;

	/**
	 * Whether to show the site title
	 */
	export let showSiteTitle: boolean = true;

	$: siteTitle = deploymentConfig.siteTitle;

	/**
	 * Generate the full title dynamically
	 */
	$: pageTitle = !page
		? siteTitle
		: showSiteTitle
			? `${page}${separator ? ' | ' : ''}${siteTitle}`
			: page;
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>
