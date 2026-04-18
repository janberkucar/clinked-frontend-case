import type { ArticleDto } from '../dto/article.dto';
import type { ArticleListItem } from '../../../shared/models/article-list-item.model';
import type { Article } from '../../../shared/models/article.model';

// NOTE(@Janberk): From the case study, the max length of the excerpt is 160 characters.
export const ARTICLE_EXCERPT_MAX_LENGTH = 160;

// ----------------------------------------------------------//
// Excerpt methods -------------------------------------- ---//
function excerptFromContent(content: string, maxLen: number): string {
  const normalized = content.trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  const slice = normalized.slice(0, maxLen).trimEnd();
  return `${slice}…`;
}
export function mapArticleFromDto(dto: ArticleDto): Article {
  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    category: dto.category,
    publishedDate: dto.publishedDate,
    commentCount: dto.commentCount,
  };
}
export function mapArticleListItemFromDto(
  dto: ArticleDto,
  excerptMaxLength: number = ARTICLE_EXCERPT_MAX_LENGTH,
): ArticleListItem {
  // NOTE(@Janberk): Default to the max length if the excerpt max length is not provided.
  const maxLen =
    Number.isFinite(excerptMaxLength) && excerptMaxLength > 0
      ? excerptMaxLength
      : ARTICLE_EXCERPT_MAX_LENGTH;
  return {
    id: dto.id,
    title: dto.title,
    excerpt: excerptFromContent(dto.content, maxLen),
    category: dto.category,
    publishedDate: dto.publishedDate,
    commentCount: dto.commentCount,
  };
}
export function mapArticlesFromDto(dtos: readonly ArticleDto[]): Article[] {
  return dtos.map(mapArticleFromDto);
}
export function mapArticleListItemsFromDto(
  dtos: readonly ArticleDto[],
  excerptMaxLength: number = ARTICLE_EXCERPT_MAX_LENGTH,
): ArticleListItem[] {
  return dtos.map((dto) => mapArticleListItemFromDto(dto, excerptMaxLength));
}
