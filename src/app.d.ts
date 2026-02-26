/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
	
	interface ImportMetaEnv {
		VITE_GOOGLE_CLIENT_ID: string;
	}
}

export {};
