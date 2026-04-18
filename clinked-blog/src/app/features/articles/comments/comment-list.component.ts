import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  finalize,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Comment } from '../../../shared/models/comment.model';

type CommentsState =
  | { readonly kind: 'noArticle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'ready'; readonly comments: readonly Comment[] }
  | { readonly kind: 'error'; readonly message: string };

@Component({
  selector: 'app-comment-list',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentListComponent {
  private static nearestRouteWithParam(
    route: ActivatedRoute,
    param: string,
  ): ActivatedRoute {
    let r: ActivatedRoute | null = route;
    while (r) {
      if (r.snapshot?.paramMap?.has(param)) {
        return r;
      }
      r = r.parent ?? null;
    }
    return route.parent ?? route;
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articleApi = inject(ArticleApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly articleRoute = CommentListComponent.nearestRouteWithParam(
    this.route,
    'id',
  );

  /** Same base as the article route when using `[{ outlets: { side: null } }]`. */
  protected readonly relativeTo = this.articleRoute;

  private readonly parentParamMap$ = this.articleRoute.paramMap;

  readonly articleId = toSignal(
    this.parentParamMap$.pipe(map((pm) => pm.get('id'))),
    { initialValue: null as string | null },
  );

  readonly contentControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly submitting = signal(false);

  readonly commentsState = toSignal(
    combineLatest([
      this.parentParamMap$.pipe(map((pm) => pm.get('id'))),
      this.articleApi.commentsChangedForArticle$.pipe(
        startWith(null as string | null),
      ),
    ]).pipe(
      switchMap(([articleId, _changed]) => {
        if (!articleId?.trim()) {
          return of<CommentsState>({ kind: 'noArticle' });
        }
        return this.articleApi.getComments(articleId).pipe(
          map((rows): CommentsState =>
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
          startWith<CommentsState>({ kind: 'loading' }),
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

  /**
   * Absolute commands so closing the `side` outlet works even when the named-outlet
   * route’s parent chain does not match `article/:id` the way `routerLink` expects.
   * Must stay aligned with `articles.routes` (`path: 'article/:id'`).
   */
  readonly closeSideOutletCommands = computed((): unknown[] | null => {
    const id = this.articleId();
    if (!id?.trim()) {
      return null;
    }
    return ['/article', id, { outlets: { side: null } }];
  });

  onSubmit(): void {
    const id = this.articleId();
    const raw = this.contentControl.value.trim();
    if (!id?.trim() || this.submitting()) {
      return;
    }
    if (this.contentControl.invalid || raw.length === 0) {
      this.contentControl.markAsTouched();
      return;
    }

    this.submitting.set(true);
    this.articleApi
      .addComment(id, raw)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.contentControl.reset('', { emitEvent: false });
          this.contentControl.markAsPristine();
          this.contentControl.markAsUntouched();
        },
        error: () => {
          /* keep form; optional: toast */
        },
      });
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
    this.closePanel();
  }

  trackById(_index: number, item: Comment): string {
    return item.id;
  }
}
