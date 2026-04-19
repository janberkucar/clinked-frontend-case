/* Core Imports */
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
/* RxJS Imports */
import {
  catchError,
  combineLatest,
  map,
  type Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
/* API Imports */
import { ArticleApiService } from '../../../core/api/services/article-api.service';
/* Model Imports */
import type { Article } from '../../../shared/models/article.model';
/* Router Imports */
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';

/* UI State */
type ArticleDetailUIState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ready'; readonly article: Article };

@Component({
  selector: 'app-article-detail',
  imports: [RouterOutlet, RouterLink, DatePipe],
  templateUrl: './article-detail.page.html',
  styleUrl: './article-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly articleApi = inject(ArticleApiService);

  readonly detailState = toSignal(
    combineLatest([
      this.route.paramMap,
      this.articleApi.commentsChangedForArticle$.pipe(
        startWith(null as string | null)
      ),
    ]).pipe(
      map(([paramMap]) => paramMap.get('id')),
      switchMap((id): Observable<ArticleDetailUIState> => {
        if (!id?.trim()) {
          return of({ kind: 'notFound' } as const);
        }
        return this.articleApi.getArticleById(id).pipe(
          map(
            (article): ArticleDetailUIState =>
              article ? { kind: 'ready', article } : { kind: 'notFound' },
          ),
          catchError(
            (err: unknown): Observable<ArticleDetailUIState> =>
              of({
                kind: 'error',
                message:
                  err instanceof Error ? err.message : 'Failed to load article',
              }),
          ),
          startWith<ArticleDetailUIState>({ kind: 'loading' }),
        );
      }),
    ),
    {
      initialValue: { kind: 'loading' } satisfies ArticleDetailUIState,
    },
  );

  /** Non-null only when `detailState().kind === 'ready'` — use inside that branch. */
  readonly article = computed((): Article | null => {
    const s = this.detailState();
    return s.kind === 'ready' ? s.article : null;
  });

  readonly errorMessage = computed(() => {
    const s = this.detailState();
    return s.kind === 'error' ? s.message : '';
  });
}
