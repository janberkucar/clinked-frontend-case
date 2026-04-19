/* Core Imports */
import { DatePipe } from '@angular/common';
import {
  animate,
  keyframes,
  query,
  sequence,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
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
  | {
      readonly resultKind: 'pending';
      readonly data: readonly ArticleListItem[];
    }
  | {
      readonly resultKind: 'success';
      readonly data: readonly ArticleListItem[];
    };
/* UI State */
type ArticleListUiState = 'loading' | 'empty' | 'no-results' | 'ready';
@Component({
  selector: 'app-article-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './article-list.page.html',
  styleUrl: './article-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('articleListContentIn', [
      transition(':enter', [
        sequence([
          query(
            ':scope > .list-grid > li',
            [style({ opacity: 0, transform: 'translateY(48px)' })],
            { optional: true },
          ),
          query(
            ':scope > .list-container__header > *',
            [
              style({ opacity: 0, transform: 'translateY(20px)' }),
              stagger(
                88,
                animate(
                  '0.52s cubic-bezier(0.16, 1, 0.3, 1)',
                  style({ opacity: 1, transform: 'translateY(0)' }),
                ),
              ),
            ],
            { optional: true },
          ),
          query(
            ':scope > .list-grid > li',
            [
              stagger(
                78,
                animate(
                  '0.72s cubic-bezier(0.16, 1, 0.3, 1)',
                  keyframes([
                    style({
                      offset: 0,
                      opacity: 0,
                      transform: 'translateY(48px)',
                    }),
                    style({
                      offset: 0.5,
                      opacity: 1,
                      transform: 'translateY(12px)',
                    }),
                    style({
                      offset: 1,
                      opacity: 1,
                      transform: 'translateY(0)',
                    }),
                  ]),
                ),
              ),
            ],
            { optional: true },
          ),
        ]),
      ]),
    ]),
  ],
})
export class ArticleListPage {
  private readonly articleApi = inject(ArticleApiService);
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
