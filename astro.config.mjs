// @ts-check

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import remarkGithubBlockquoteAlerts from "remark-github-blockquote-alert";
import mermaid from "astro-mermaid";

import { remarkCanvasDemo } from "./src/plugins/remark-canvas-demo.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://mdbell.ca",
	integrations: [
		mdx(),
		sitemap(),
		mermaid({
			// Theme options: 'dark', 'default', 'forest', 'neutral'
			theme: "dark",
		}),
	],
	fonts: [
		{
			provider: fontProviders.local(),
			name: "Atkinson",
			cssVariable: "--font-atkinson",
			fallbacks: ["sans-serif"],
			options: {
				variants: [
					{
						src: ["./src/assets/fonts/atkinson-regular.woff"],
						weight: 400,
						style: "normal",
						display: "swap",
					},
					{
						src: ["./src/assets/fonts/atkinson-bold.woff"],
						weight: 700,
						style: "normal",
						display: "swap",
					},
				],
			},
		},
	],
	markdown: {
		processor: unified({
			remarkPlugins: [remarkGithubBlockquoteAlerts, remarkCanvasDemo],
		}),
	},
});
