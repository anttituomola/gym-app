import adapter from '@sveltejs/adapter-auto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$convex: path.resolve(__dirname, './convex')
		}
	}
};

export default config;
