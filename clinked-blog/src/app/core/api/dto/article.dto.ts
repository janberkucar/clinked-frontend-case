import type { ArticleCategory } from '../../../shared/models/article.category';

export interface ArticleDto {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly category?: ArticleCategory;
  readonly publishedDate: string;
  readonly commentCount: number;
}

/** Create body; `id`, `publishedDate`, and `commentCount` are set by the API service. */
export type CreateArticlePayload = Omit<
  ArticleDto,
  'id' | 'publishedDate' | 'commentCount'
>;
