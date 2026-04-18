/* Core Imports */
import { Injectable } from '@angular/core';
import {
  defer,
  delay,
  map,
  type Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
/* DTO Imports */
import type { ArticleDto, CreateArticlePayload } from '../dto/article.dto';
import type { CommentDto } from '../dto/comment.dto';
/* Mapper Imports */
import {
  mapArticleFromDto,
  mapArticleListItemsFromDto,
} from '../mappers/article.mapper';
import {
  mapCommentFromDto,
  mapCommentsFromDto,
} from '../mappers/comment.mapper';
/* Model Imports */
import type { ArticleListItem } from '../../../shared/models/article-list-item.model';
import type { Article } from '../../../shared/models/article.model';
import type { Comment } from '../../../shared/models/comment.model';
import {
  ARTICLE_CATEGORY_OPTIONS,
  type ArticleCategory,
} from '../../../shared/models/article.category';
/* Constants */
const MOCK_LATENCY_MS = 180;
// NOTE(@Janberk): The fields does not need to include 'commentCount' since it is always derived from '#commentsByArticleId'.
type ArticleDtoSeed = Omit<ArticleDto, 'commentCount'>;
// NOTE(@Janberk): In-memory mock seed. `publishedDate` is always ISO 8601 UTC (`…Z`);
const SEED_ARTICLE_ROWS: readonly ArticleDtoSeed[] = [
  {
    id: '0',
    title: 'Clinked blog title 1',
    content:
      "Breathe (in the air) song from Pink Floyd and the 70's Air guitar might be the new future of the cats.",
    category: 'Cats',
    publishedDate: '2026-06-18T09:15:00.000Z',
  },
  {
    id: '1',
    title: 'Clinked blog title 2',
    content:
      "Daft Punk released their new album 'Random Access Memories' and it's a masterpiece. and might be the new future of the dogs.",
    category: 'Not Funny',
    publishedDate: '2026-06-17T14:30:00.000Z',
  },
  {
    id: '2',
    title: 'Clinked blog title 3',
    content:
      "50 Cent released his new album 'The Massacre' and it's a masterpiece. and might be the new future of the dogs.",
    category: 'Dogs',
    publishedDate: '2026-06-10T22:45:00.000Z',
  },
];
/* Mock Api Methods */
function seedCommentsByArticle(): Map<string, CommentDto[]> {
  return new Map<string, CommentDto[]>([
    [
      '0',
      [
        {
          id: 'c-0-0',
          articleId: '0',
          content: 'Mock comment on article 0.',
          createdAt: '2026-06-18T10:00:00.000Z',
        },
      ],
    ],
    [
      '1',
      [
        {
          id: 'c-1-0',
          articleId: '1',
          content: 'First comment on article 1.',
          createdAt: '2026-06-17T16:00:00.000Z',
        },
        {
          id: 'c-1-1',
          articleId: '1',
          content: 'Second comment on article 1.',
          createdAt: '2026-06-17T17:05:00.000Z',
        },
      ],
    ],
    [
      '2',
      [
        {
          id: 'c-2-0',
          articleId: '2',
          content: 'Mock comment on article 2.',
          createdAt: '2026-06-11T08:30:00.000Z',
        },
      ],
    ],
  ]);
}
// NOTE(@Janberk): Generate a new ID for a new article or comment.
function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

const ALLOWED_CATEGORY = new Set<string>(ARTICLE_CATEGORY_OPTIONS);

/** Drops unknown category values so the mock store never holds invalid enums. */
function normalizedCategory(
  value: ArticleCategory | undefined,
): ArticleCategory | undefined {
  if (value === undefined) {
    return undefined;
  }
  return ALLOWED_CATEGORY.has(value) ? value : undefined;
}

@Injectable({ providedIn: 'root' })
export class ArticleApiService {
  /** Emits `articleId` after comments map mutates so UIs can re-query `getArticleById` / `getComments`. */
  readonly #commentsChangedForArticle = new Subject<string>();
  readonly commentsChangedForArticle$ =
    this.#commentsChangedForArticle.asObservable();

  readonly #commentsByArticleId: Map<string, CommentDto[]> =
    seedCommentsByArticle();

  /**
   * `commentCount` on stored DTOs is a placeholder;
   *  use {@link #liveArticleDto} when mapping out.
   */
  readonly #articleDtos: ArticleDto[] = SEED_ARTICLE_ROWS.map((row) => ({
    ...row,
    commentCount: 0,
  }));
  /** Note(@Janberk): Live comment count for an article. */
  #commentCountFor(articleId: string): number {
    return this.#commentsByArticleId.get(articleId)?.length ?? 0;
  }
  // NOTE(@Janberk): Map of comments by article ID.
  #liveArticleDto(dto: ArticleDto): ArticleDto {
    return {
      ...dto,
      commentCount: this.#commentCountFor(dto.id),
    };
  }

  // NOTE(@Janberk): Get all articles.
  getArticles(): Observable<ArticleListItem[]> {
    return defer(() => of([...this.#articleDtos])).pipe(
      delay(MOCK_LATENCY_MS),
      map((rows) =>
        mapArticleListItemsFromDto(
          rows.map((row) => this.#liveArticleDto(row)),
        ),
      ),
    );
  }

  // NOTE(@Janberk): Get an article by ID.
  getArticleById(id: string): Observable<Article | null> {
    return defer(() => {
      const dto = this.#articleDtos.find((row) => row.id === id);
      return of(dto ? mapArticleFromDto(this.#liveArticleDto(dto)) : null);
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  /**
   * Persists a new article. Owns `publishedDate` (ISO UTC) and `id`; callers must not send them.
   */
  createArticle(payload: CreateArticlePayload): Observable<Article> {
    return defer(() => {
      const id = newId('article');
      const dto: ArticleDto = {
        id,
        title: payload.title,
        content: payload.content,
        category: normalizedCategory(payload.category),
        publishedDate: new Date().toISOString(),
        commentCount: 0,
      };

      this.#articleDtos.push(dto);
      this.#commentsByArticleId.set(id, []);

      return of(mapArticleFromDto(this.#liveArticleDto(dto)));
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  // NOTE(@Janberk): Get comments for an article.
  getComments(articleId: string): Observable<Comment[]> {
    return defer(() => {
      const rows = this.#commentsByArticleId.get(articleId) ?? [];
      return of(mapCommentsFromDto(rows));
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  // NOTE(@Janberk): Add a new comment to an article.
  addComment(articleId: string, content: string): Observable<Comment> {
    return defer(() => {
      const articleIndex = this.#articleDtos.findIndex(
        (row) => row.id === articleId,
      );
      if (articleIndex === -1) {
        return throwError(
          () => new Error(`ArticleApiService.addComment: unknown articleId`),
        );
      }
      const dto: CommentDto = {
        id: newId('comment'),
        articleId,
        content,
        createdAt: new Date().toISOString(),
      };
      const existing = this.#commentsByArticleId.get(articleId) ?? [];
      this.#commentsByArticleId.set(articleId, [...existing, dto]);
      this.#commentsChangedForArticle.next(articleId);

      return of(mapCommentFromDto(dto));
    }).pipe(delay(MOCK_LATENCY_MS));
  }
}
