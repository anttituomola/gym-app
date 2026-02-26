
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/history" | "/login" | "/programs" | "/programs/builder" | "/settings" | "/workout";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/history": Record<string, never>;
			"/login": Record<string, never>;
			"/programs": Record<string, never>;
			"/programs/builder": Record<string, never>;
			"/settings": Record<string, never>;
			"/workout": Record<string, never>
		};
		Pathname(): "/" | "/history" | "/login" | "/programs" | "/programs/builder" | "/settings" | "/workout";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/favicon.svg" | "/icon-192.svg" | "/icon-512.svg" | "/manifest.json" | "/robots.txt" | string & {};
	}
}