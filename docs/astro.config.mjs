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
			logo: {
				light: './src/assets/brand/icon-line.svg',
				dark: './src/assets/brand/icon-line-dark.svg',
			},
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
						{ label: 'Groups & Extras', slug: 'core-concepts/groups' },
						{ label: 'Word Counting', slug: 'core-concepts/word-counting' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Project Management', slug: 'features/project-management' },
						{ label: 'The Library', slug: 'features/library' },
						{ label: 'The Inspector', slug: 'features/inspector' },
						{ label: 'Exporting & Compiling', slug: 'features/exporting' },
						{ label: 'Splitting & Merging Notes', slug: 'features/splitting-and-merging' },
						{ label: 'Flow Mode', slug: 'features/flow-mode' },
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
