import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Define available themes
export const themes = [
	{ name: 'default', className: 'theme-default' },
	{ name: 'dark', className: 'theme-dark' },
	{ name: 'birthday', className: 'theme-birthday' },
	{ name: 'neon', className: 'theme-neon' }
];

// Create a writable store for the current theme
export const currentTheme = writable(Object.freeze(themes[0]));

// Function to apply a theme
type Theme = {
	name: string;
	className: string;
};

export function applyTheme(theme: Theme) {
	document.documentElement.className = theme.className;
	currentTheme.set(Object.freeze(theme));
}
