import typography from '@tailwindcss/typography';
import flowbitePlugin from 'flowbite/plugin';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	corePlugins: {
		preflight: false
	},
	plugins: [typography, flowbitePlugin]
} satisfies Config;
