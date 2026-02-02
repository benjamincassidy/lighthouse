// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://benjamincassidy.github.io',
	base: '/lighthouse',
	integrations: [
		starlight({
			title: 'Lighthouse',
			description: 'Project-based writing for Obsidian',
			social: [
				{
					name: 'GitHub',
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/benjamincassidy/lighthouse',
				},
			],
			editLink: {
				baseUrl: 'https://github.com/benjamincassidy/lighthouse/edit/main/docs/',
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Core Concepts',
					items: [
						{ label: 'Projects', slug: 'core-concepts/projects' },
						{ label: 'Content vs Source Folders', slug: 'core-concepts/folders' },
						{ label: 'Word Counting', slug: 'core-concepts/word-counting' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Project Dashboard', slug: 'features/dashboard' },
						{ label: 'Writing Stats Panel', slug: 'features/stats-panel' },
						{ label: 'Project Management', slug: 'features/project-management' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Creating Your First Project', slug: 'guides/first-project' },
						{ label: 'Organizing Your Work', slug: 'guides/organizing' },
						{ label: 'Tracking Progress', slug: 'guides/tracking-progress' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Settings', slug: 'reference/settings' },
						{ label: 'Commands', slug: 'reference/commands' },
						{ label: 'Troubleshooting', slug: 'reference/troubleshooting' },
					],
				},
			],
			customCss: ['./src/styles/custom.css'],
		}),
	],
});
