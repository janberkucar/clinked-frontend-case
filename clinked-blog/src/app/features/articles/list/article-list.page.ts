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
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';
/* API Imports */
import { ArticleApiService } from '../../../core/api/services/article-api.service';
/* Model Imports */
import type { ArticleListItem } from '../../../shared/models/article-list-item.model';
/* Forms Imports */
import { FormControl, ReactiveFormsModule } from '@angular/forms';
/* Router Imports */
import { RouterLink } from '@angular/router';

/* Result UI State */
type ArticleListResultState =
  | { readonly resultKind: 'pending'; readonly data: readonly ArticleListItem[] }
  | { readonly resultKind: 'success'; readonly data: readonly ArticleListItem[] };

/* UI State */
type ArticleListUiState = 'loading' | 'empty' | 'no-results' | 'ready';

@Component({
  selector: 'app-article-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './article-list.page.html',
  styleUrl: './article-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleListPage {
  private readonly articleApi = inject(ArticleApiService);

  /** Bound in template — debounced via Rx → signal. */
  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly articlesResult = toSignal(
    this.articleApi.getArticles().pipe(
      map(
        (data): ArticleListResultState => ({
          resultKind: 'success',
          data,
        }),
      ),
      startWith<ArticleListResultState>({
        resultKind: 'pending',
        data: [],
      }),
    ),
    {
      initialValue: {
        resultKind: 'pending',
        data: [],
      } satisfies ArticleListResultState,
    },
  );

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.searchControl.value),
    ),
    { initialValue: '' },
  );

  readonly filteredArticles = computed(() => {
    const items = this.articlesResult().data;
    const q = this.searchTerm().trim().toLowerCase();
    if (q.length === 0) {
      return items;
    }
    return items.filter((a) => a.title.toLowerCase().includes(q));
  });

  readonly listState = computed<ArticleListUiState>(() => {
    const { resultKind, data } = this.articlesResult();
    const filtered = this.filteredArticles();
    if (resultKind === 'pending') {
      return 'loading';
    }
    if (data.length === 0) {
      return 'empty';
    }
    if (filtered.length === 0) {
      return 'no-results';
    }
    return 'ready';
  });

  trackById(_index: number, item: ArticleListItem): string {
    return item.id;
  }
}
