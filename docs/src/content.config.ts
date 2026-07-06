import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const docsCollectionConfig: Parameters<typeof defineCollection>[0] = {
	loader: docsLoader(),
	schema: docsSchema(),
};

export const collections = {
	docs: defineCollection(docsCollectionConfig),
};
