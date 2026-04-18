import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { ArticleListItem } from '../../../shared/models/article-list-item.model';

type ArticlesLoadState =
  | { readonly status: 'pending'; readonly data: readonly ArticleListItem[] }
  | { readonly status: 'success'; readonly data: readonly ArticleListItem[] };

type ListUiState = 'loading' | 'empty' | 'no-results' | 'ready';

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
        (data): ArticlesLoadState => ({
          status: 'success',
          data,
        }),
      ),
      startWith<ArticlesLoadState>({
        status: 'pending',
        data: [],
      }),
    ),
    {
      initialValue: {
        status: 'pending',
        data: [],
      } satisfies ArticlesLoadState,
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

  readonly uiState = computed<ListUiState>(() => {
    const { status, data } = this.articlesResult();
    const filtered = this.filteredArticles();
    if (status === 'pending') {
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
