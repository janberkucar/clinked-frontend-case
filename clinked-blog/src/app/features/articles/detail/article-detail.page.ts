import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import {
  catchError,
  combineLatest,
  map,
  type Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Article } from '../../../shared/models/article.model';

type DetailLoadState =
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

  /**
   * Route param + comment mutations → `getArticleById` so `commentCount` stays in sync
   * after `addComment` without duplicating count state in the template.
   */
  readonly detailState = toSignal(
    combineLatest([
      this.route.paramMap,
      this.articleApi.commentsChangedForArticle$.pipe(
        startWith(null as string | null),
      ),
    ]).pipe(
      map(([pm]) => pm.get('id')),
      switchMap((id): Observable<DetailLoadState> => {
        if (!id?.trim()) {
          return of({ kind: 'notFound' } as const);
        }
        return this.articleApi.getArticleById(id).pipe(
          map(
            (article): DetailLoadState =>
              article ? { kind: 'ready', article } : { kind: 'notFound' },
          ),
          catchError(
            (err: unknown): Observable<DetailLoadState> =>
              of({
                kind: 'error',
                message:
                  err instanceof Error ? err.message : 'Failed to load article',
              }),
          ),
          startWith<DetailLoadState>({ kind: 'loading' }),
        );
      }),
    ),
    {
      initialValue: { kind: 'loading' } satisfies DetailLoadState,
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
