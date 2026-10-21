import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().max(170),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    lang: z.enum(['en']).default('en'),
    day: z.number(),
    pillar: z.string(),
    cluster: z.string(),
    segment: z.string(),
    funnelStage: z.enum(['awareness', 'consideration', 'decision']),
    moneyPage: z.string(),
    cta: z.string(),
    aiQuestion: z.string(),
    primaryKeyword: z.string(),
    secondaryKeywords: z.array(z.string()),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    sources: z
      .array(z.object({ title: z.string(), url: z.string(), checked: z.coerce.date() }))
      .optional(),
    draft: z.boolean().default(false),
    author: z.string().default('The Ucraya team'),
  }),
});

export const collections = { blog };
