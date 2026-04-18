// NOTE(@Janberk): Article Category needs to be extended with more categories in the future.
export type ArticleCategory = 'Cats' | 'Dogs' | 'Not Funny';

/** Allowed category values for selects and API normalization (no free-text category). */
export const ARTICLE_CATEGORY_OPTIONS = [
  'Cats',
  'Dogs',
  'Not Funny',
] as const satisfies readonly ArticleCategory[];
