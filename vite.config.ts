import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	server: {
		fs: {
			allow: ['.', '..']
		}
	},
	resolve: {
		alias: {
			'$convex': '/convex'
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'LiftLog',
				short_name: 'LiftLog',
				description: 'Personal gym training log with AI-powered workout modifications',
				start_url: '/',
				display: 'standalone',
				background_color: '#0f0f0f',
				theme_color: '#3b82f6',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	]
});
