import type { ArticleCategory } from './article.category';

// Article Model for Frontend Client Side
export interface Article {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly category?: ArticleCategory;
  readonly publishedDate: string;
  readonly commentCount: number;
}
