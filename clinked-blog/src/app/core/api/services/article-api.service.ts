/* Core Imports */
import { Injectable } from '@angular/core';
/* RxJS Imports */
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
// NOTE(@Janberk): `ArticleDtoSeed` omits `commentCount`; it is always derived from `#commentsByArticleId`.
type ArticleDtoSeed = Omit<ArticleDto, 'commentCount'>;
// NOTE(@Janberk): In-memory mock seed. `publishedDate` is always ISO 8601 UTC (`…Z`), as in the case study examples.
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

// NOTE(@Janberk): Drops unknown category values so the mock store never holds invalid enums.
function normalizedCategory(
  value: ArticleCategory | undefined,
): ArticleCategory | undefined {
  if (value === undefined) {
    return undefined;
  }
  return ALLOWED_CATEGORY.has(value) ? value : undefined;
}

/* Local storage snapshot (mock persistence) */
const STORAGE_KEY = 'clinked-blog-mock-v1';

type MockStorageSnapshotV1 = {
  readonly version: 1;
  readonly articles: ArticleDto[];
  readonly commentsByArticleId: Record<string, CommentDto[]>;
};

function defaultArticleRows(): ArticleDto[] {
  return SEED_ARTICLE_ROWS.map((row) => ({
    ...row,
    commentCount: 0,
  }));
}

function tryReadSnapshot(): MockStorageSnapshotV1 | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === '') {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as MockStorageSnapshotV1).version !== 1 ||
      !Array.isArray((parsed as MockStorageSnapshotV1).articles) ||
      typeof (parsed as MockStorageSnapshotV1).commentsByArticleId !==
        'object' ||
      (parsed as MockStorageSnapshotV1).commentsByArticleId === null
    ) {
      return null;
    }
    return parsed as MockStorageSnapshotV1;
  } catch {
    return null;
  }
}

function tryPersistSnapshot(
  articles: readonly ArticleDto[],
  commentsByArticleId: ReadonlyMap<string, CommentDto[]>,
): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const commentsRecord: Record<string, CommentDto[]> = {};
    for (const [articleId, rows] of commentsByArticleId.entries()) {
      commentsRecord[articleId] = rows.map((c) => ({ ...c }));
    }
    const snapshot: MockStorageSnapshotV1 = {
      version: 1,
      articles: articles.map((row) => ({
        ...row,
        commentCount: 0,
      })),
      commentsByArticleId: commentsRecord,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // NOTE(@Janberk): Quota / private mode — stay in memory only, same as read failure.
  }
}

@Injectable({ providedIn: 'root' })
export class ArticleApiService {
  // NOTE(@Janberk): Emit articleId after add/remove comment so detail + list can refetch and show the new commentCount.
  readonly #commentsChangedForArticle = new Subject<string>();
  readonly commentsChangedForArticle$ =
    this.#commentsChangedForArticle.asObservable();

  readonly #commentsByArticleId: Map<string, CommentDto[]>;

  // NOTE(@Janberk): commentCount on stored DTOs is not authoritative; #liveArticleDto fills it from #commentsByArticleId.
  readonly #articleDtos: ArticleDto[];

  // NOTE(@Janberk): Hydrate from localStorage if present; otherwise seed rows + default comments map.
  constructor() {
    const snapshot = tryReadSnapshot();
    if (snapshot) {
      this.#articleDtos = snapshot.articles.map((row) => ({
        ...row,
        commentCount: 0,
      }));
      this.#commentsByArticleId = new Map(
        Object.entries(snapshot.commentsByArticleId).map(([k, rows]) => [
          k,
          rows.map((c) => ({ ...c })),
        ]),
      );
    } else {
      this.#articleDtos = defaultArticleRows();
      this.#commentsByArticleId = seedCommentsByArticle();
    }
    for (const row of this.#articleDtos) {
      if (!this.#commentsByArticleId.has(row.id)) {
        this.#commentsByArticleId.set(row.id, []);
      }
    }
  }
  // NOTE(@Janberk): Live comment count for an article.
  #commentCountFor(articleId: string): number {
    return this.#commentsByArticleId.get(articleId)?.length ?? 0;
  }
  // NOTE(@Janberk): Article row with `commentCount` filled from live `#commentsByArticleId` (not the stale field on the stored DTO).
  #liveArticleDto(dto: ArticleDto): ArticleDto {
    return {
      ...dto,
      commentCount: this.#commentCountFor(dto.id),
    };
  }

  // NOTE(@Janberk): Persist full mock state after any write (create article / add comment).
  #persist(): void {
    tryPersistSnapshot(this.#articleDtos, this.#commentsByArticleId);
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
    const nid = id.trim();
    return defer(() => {
      const dto = this.#articleDtos.find((row) => row.id === nid);
      return of(dto ? mapArticleFromDto(this.#liveArticleDto(dto)) : null);
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  // NOTE(@Janberk): Creates id + publishedDate (ISO 8601 UTC) here — callers must not send them (case study rule).
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
      this.#persist();

      return of(mapArticleFromDto(this.#liveArticleDto(dto)));
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  // NOTE(@Janberk): Get comments for an article.
  getComments(articleId: string): Observable<Comment[]> {
    const aid = articleId.trim();
    return defer(() => {
      const rows = this.#commentsByArticleId.get(aid) ?? [];
      return of(mapCommentsFromDto(rows));
    }).pipe(delay(MOCK_LATENCY_MS));
  }

  // NOTE(@Janberk): Add a new comment to an article.
  addComment(articleId: string, content: string): Observable<Comment> {
    const aid = articleId.trim();
    return defer(() => {
      const articleIndex = this.#articleDtos.findIndex((row) => row.id === aid);
      if (articleIndex === -1) {
        return throwError(
          () => new Error(`ArticleApiService.addComment: unknown articleId`),
        );
      }
      const dto: CommentDto = {
        id: newId('comment'),
        articleId: aid,
        content,
        createdAt: new Date().toISOString(),
      };
      const existing = this.#commentsByArticleId.get(aid) ?? [];
      this.#commentsByArticleId.set(aid, [...existing, dto]);
      this.#persist();
      this.#commentsChangedForArticle.next(aid);

      return of(mapCommentFromDto(dto));
    }).pipe(delay(MOCK_LATENCY_MS));
  }
}
