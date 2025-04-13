import typography from '@tailwindcss/typography';
import flowbitePlugin from 'flowbite/plugin';
import type { Config } from 'tailwindcss';

export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],
	darkMode: 'selector',
	theme: {
		extend: {
			colors: {
				primary: {
					50: 'var(--color-primary-50, #FFF5F2)',
					100: 'var(--color-primary-100, #FFF1EE)',
					200: 'var(--color-primary-200, #FFE4DE)',
					300: 'var(--color-primary-300, #FFD5CC)',
					400: 'var(--color-primary-400, #FFBCAD)',
					500: 'var(--color-primary-500, #FE795D)',
					600: 'var(--color-primary-600, #EF562F)',
					700: 'var(--color-primary-700, #EB4F27)',
					800: 'var(--color-primary-800, #CC4522)',
					900: 'var(--color-primary-900, #A5371B)'
				},
				secondary: {
					50: 'var(--color-secondary-50, #ecfdf5)',
					100: 'var(--color-secondary-100, #d1fae5)',
					200: 'var(--color-secondary-200, #a7f3d0)',
					300: 'var(--color-secondary-300, #6ee7b7)',
					400: 'var(--color-secondary-400, #34d399)',
					500: 'var(--color-secondary-500, #10b981)',
					600: 'var(--color-secondary-600, #059669)',
					700: 'var(--color-secondary-700, #047857)',
					800: 'var(--color-secondary-800, #065f46)',
					900: 'var(--color-secondary-900, #064e3b)'
				}
			},
			typography: {
				hina: {
					css: {
						maxWidth: '100%',
						p: {
							marginTop: '0.25em',
							marginBottom: '0.25em'
						},
						'blockquote p:first-of-type::before': { content: 'none' },
						'blockquote p:last-of-type::after': { content: 'none' },
						h1: { marginTop: '0.75em', marginBottom: '0.125em', fontSize: '1.5em' },
						h2: { marginTop: '0.5em', marginBottom: '0.125em', fontSize: '1.25em' },
						h3: { marginTop: '0.5em', marginBottom: '0.125em', fontSize: '1.1em' },
						h4: { marginTop: '0.375em', marginBottom: '0.125em', fontSize: '1em' },
						li: { marginTop: '0.1em', marginBottom: '0.1em' },
						'ul > li': {
							paddingLeft: '0.75em'
						},
						'ol > li': {
							paddingLeft: '0.75em'
						}
					}
				}
			}
		}
	},
	plugins: [typography, flowbitePlugin]
} satisfies Config;
