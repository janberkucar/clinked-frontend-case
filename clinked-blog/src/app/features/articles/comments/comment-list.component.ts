/* Core Imports */
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
/* Forms Imports */
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
/* Router Imports */
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  type ActivatedRouteSnapshot,
} from '@angular/router';
/* RxJS Imports */
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  of,
  startWith,
  switchMap,
  take,
} from 'rxjs';
/* API Imports */
import { ArticleApiService } from '../../../core/api/services/article-api.service';
/* Model Imports */
import type { Comment } from '../../../shared/models/comment.model';

type CommentsState =
  | { readonly kind: 'noArticle' }
  | { readonly kind: 'articleNotFound' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'ready'; readonly comments: readonly Comment[] }
  | { readonly kind: 'error'; readonly message: string };

function articleIdFromRouterUrl(url: string): string | null {
  const path = url.startsWith('/') ? url : `/${url}`;
  const match = /\/article\/([^/?#(;]+)/.exec(path);
  const segment = match?.[1]?.trim();
  return segment ? decodeURIComponent(segment) : null;
}

// NOTE(@Janberk): Named-outlet children do not always inherit `id` on `paramMap`; walk ancestors then the full router snapshot (then URL).
function articleIdFromActivatedRouteTree(route: ActivatedRoute): string | null {
  let r: ActivatedRoute | null = route;
  while (r) {
    const id = r.snapshot.paramMap.get('id');
    if (id != null && id.trim() !== '') {
      return id;
    }
    r = r.parent;
  }
  return null;
}

function firstArticleIdInSnapshotTree(
  root: ActivatedRouteSnapshot,
): string | null {
  const id = root.paramMap.get('id');
  if (id != null && id.trim() !== '') {
    return id;
  }
  for (const child of root.children) {
    const found = firstArticleIdInSnapshotTree(child);
    if (found != null) {
      return found;
    }
  }
  return null;
}

function pickArticleId(route: ActivatedRoute, router: Router): string | null {
  const raw =
    articleIdFromActivatedRouteTree(route) ??
    (router.routerState?.snapshot?.root
      ? firstArticleIdInSnapshotTree(router.routerState.snapshot.root)
      : null) ??
    articleIdFromRouterUrl(router.url);
  const trimmed = raw?.trim();
  return trimmed === '' || trimmed === undefined ? null : trimmed;
}

@Component({
  selector: 'app-comment-list',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articleApi = inject(ArticleApiService);

  private readonly articleRoute = this.route.parent ?? this.route;

  private readonly articleId$ = merge(
    of(null),
    this.articleRoute.paramMap.pipe(map(() => null)),
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ),
  ).pipe(
    map(() => pickArticleId(this.route, this.router)),
    distinctUntilChanged(),
  );

  readonly articleId = toSignal(this.articleId$, { initialValue: null });

  readonly contentControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly submitting = signal(false);
  readonly commentPostError = signal<string | null>(null);

  readonly commentsState = toSignal(
    combineLatest([
      this.articleId$,
      this.articleApi.commentsChangedForArticle$.pipe(
        startWith(null as string | null),
      ),
    ]).pipe(
      switchMap(([articleId, changed]) => {
        if (articleId == null || articleId.trim() === '') {
          return of<CommentsState>({ kind: 'noArticle' });
        }
        const skipLoading = changed !== null && changed === articleId;

        return this.articleApi.getArticleById(articleId).pipe(
          switchMap((article) => {
            if (!article) {
              return of<CommentsState>({ kind: 'articleNotFound' });
            }
            const data$ = this.articleApi.getComments(articleId).pipe(
              map(
                (rows): CommentsState =>
                  rows.length > 0
                    ? { kind: 'ready', comments: rows }
                    : { kind: 'empty' },
              ),
              catchError((err: unknown) =>
                of<CommentsState>({
                  kind: 'error',
                  message:
                    err instanceof Error
                      ? err.message
                      : 'Failed to load comments',
                }),
              ),
            );
            if (skipLoading) {
              return data$;
            }
            return data$.pipe(startWith<CommentsState>({ kind: 'loading' }));
          }),
        );
      }),
    ),
    { initialValue: { kind: 'loading' } satisfies CommentsState },
  );

  readonly commentsErrorMessage = computed(() => {
    const s = this.commentsState();
    return s.kind === 'error' ? s.message : '';
  });

  readonly readyComments = computed((): readonly Comment[] | null => {
    const s = this.commentsState();
    return s.kind === 'ready' ? s.comments : null;
  });

  readonly closeSideOutletCommands = computed((): unknown[] | null => {
    const id = this.articleId();
    if (id == null || id.trim() === '') {
      return null;
    }
    return ['/article', id, { outlets: { side: null } }];
  });

  onSubmit(): void {
    // NOTE(@Janberk): Resolve id from the router here (not only the signal) so submit always matches the URL/aux-outlet tree.
    const id = pickArticleId(this.route, this.router);
    const raw = this.contentControl.value.trim();
    if (id == null) {
      this.commentPostError.set(
        'Could not resolve the article for this panel. Try closing and opening comments again.',
      );
      return;
    }
    if (this.submitting()) {
      return;
    }
    if (raw.length === 0) {
      this.contentControl.markAsTouched();
      return;
    }

    this.commentPostError.set(null);
    this.submitting.set(true);
    this.articleApi
      .addComment(id, raw)
      .pipe(
        take(1),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.commentPostError.set(null);
          this.contentControl.reset('', { emitEvent: false });
          this.contentControl.markAsPristine();
          this.contentControl.markAsUntouched();
        },
        error: (err: unknown) => {
          this.commentPostError.set(
            err instanceof Error
              ? err.message
              : 'Could not post your comment. Please try again.',
          );
        },
      });
  }

  attemptClose(): void {
    if (!this.confirmDiscardPendingComment()) {
      return;
    }
    this.closePanel();
  }

  private confirmDiscardPendingComment(): boolean {
    const raw = this.contentControl.value.trim();
    if (!this.contentControl.dirty || raw.length === 0) {
      return true;
    }
    return window.confirm('Discard this comment? Your text will not be saved.');
  }

  closePanel(): void {
    const cmds = this.closeSideOutletCommands();
    if (cmds) {
      void this.router.navigate(cmds, {
        queryParamsHandling: 'preserve',
      });
      return;
    }
    void this.router.navigate([{ outlets: { side: null } }], {
      relativeTo: this.articleRoute,
      queryParamsHandling: 'preserve',
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.attemptClose();
  }

  trackById(_index: number, item: Comment): string {
    return item.id;
  }
}
