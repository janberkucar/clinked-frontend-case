import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { ArticleListItem } from '../../../shared/models/article-list-item.model';
import { ArticleListPage } from './article-list.page';

function listItem(partial: Partial<ArticleListItem>): ArticleListItem {
  return {
    id: partial.id ?? 'id',
    title: partial.title ?? 'Title',
    excerpt: partial.excerpt ?? 'Excerpt',
    publishedDate: partial.publishedDate ?? '2026-01-01T00:00:00.000Z',
    commentCount: partial.commentCount ?? 0,
    category: partial.category,
  };
}

describe('ArticleListPage', () => {
  let getArticlesSpy: jasmine.Spy;

  beforeEach(async () => {
    getArticlesSpy = jasmine.createSpy('getArticles');
    await TestBed.configureTestingModule({
      imports: [ArticleListPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: ArticleApiService, useValue: { getArticles: getArticlesSpy } },
      ],
    }).compileComponents();
  });

  it('shows empty state when the API returns no articles', () => {
    getArticlesSpy.and.returnValue(of([]));
    const fixture = TestBed.createComponent(ArticleListPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No articles available');
    expect(getArticlesSpy).toHaveBeenCalled();
  });

  it('filters by title after debounce', fakeAsync(() => {
    getArticlesSpy.and.returnValue(
      of([
        listItem({ id: '1', title: 'Alpha guide', excerpt: 'a' }),
        listItem({ id: '2', title: 'Beta notes', excerpt: 'b' }),
      ]),
    );
    const fixture = TestBed.createComponent(ArticleListPage);
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alpha guide');
    expect(fixture.nativeElement.textContent).toContain('Beta notes');

    fixture.componentInstance.searchControl.setValue('alpha');
    tick(350);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Alpha guide');
    expect(text).not.toContain('Beta notes');
  }));

  it('shows no-results when the debounced query matches nothing', fakeAsync(() => {
    getArticlesSpy.and.returnValue(
      of([listItem({ id: '1', title: 'Only one', excerpt: 'x' })]),
    );
    const fixture = TestBed.createComponent(ArticleListPage);
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();

    fixture.componentInstance.searchControl.setValue('zzznomatch');
    tick(350);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No matching articles');
  }));
});
