// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://wxy1123.github.io',
	base: '/bash-tutorial',

	integrations: [
		starlight({
			title: 'Bash 教程',
			description: '从里层逻辑到实战的 Bash 中文教程',

			defaultLocale: 'zh-CN',
			locales: {
				'zh-CN': { label: '简体中文', lang: 'zh-CN' },
			},

			editLink: {
				baseUrl: 'https://github.com/wxy1123/bash-tutorial/edit/main/',
			},

			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/wxy1123' },
			],

			sidebar: [
				{
					label: '教程',
					items: [
						{ autogenerate: { directory: '.' } },
					],
				},
			],
		}),
	],
});