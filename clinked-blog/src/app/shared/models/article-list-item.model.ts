import type { ArticleCategory } from './article.category';

// Article List Item Model for Frontend Client Side
export interface ArticleListItem {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly category?: ArticleCategory;
  readonly publishedDate: string;
  readonly commentCount: number;
}
