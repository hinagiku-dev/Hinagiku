import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
	plugins: [paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }), sveltekit()]
});
