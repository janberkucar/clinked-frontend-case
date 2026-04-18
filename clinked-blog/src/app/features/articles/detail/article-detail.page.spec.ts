import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Article } from '../../../shared/models/article.model';
import { ArticleDetailPage } from './article-detail.page';

describe('ArticleDetailPage', () => {
  let fixture: ComponentFixture<ArticleDetailPage>;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let getArticleByIdSpy: jasmine.Spy;
  const commentsChanged$ = new Subject<string>();

  const mockArticle: Article = {
    id: '0',
    title: 'Test title',
    content: '<script>evil</script>Hello',
    category: 'Cats',
    publishedDate: '2026-01-01T00:00:00.000Z',
    commentCount: 1,
  };

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ id: '0' }));
    getArticleByIdSpy = jasmine
      .createSpy('getArticleById')
      .and.returnValue(of(mockArticle));

    await TestBed.configureTestingModule({
      imports: [ArticleDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap$.asObservable() },
        },
        {
          provide: ArticleApiService,
          useValue: {
            getArticleById: getArticleByIdSpy,
            commentsChangedForArticle$: commentsChanged$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleDetailPage);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show not found when id param is missing', () => {
    paramMap$.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Article not found');
    expect(getArticleByIdSpy).not.toHaveBeenCalled();
  });

  it('should load article by id and show title and comment count from API', async () => {
    paramMap$.next(convertToParamMap({ id: '0' }));
    fixture.detectChanges();
    expect(getArticleByIdSpy).toHaveBeenCalledWith('0');

    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Test title');
    expect(text).toContain('1 comments');
    expect(text).toContain('Hello');
    expect(text).not.toContain('<script>');
  });

  it('should show not found when API returns null', async () => {
    getArticleByIdSpy.and.returnValue(of(null));
    paramMap$.next(convertToParamMap({ id: 'unknown' }));
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Article not found');
  });

  it('should show error when API errors', async () => {
    getArticleByIdSpy.and.returnValue(
      throwError(() => new Error('network down')),
    );
    paramMap$.next(convertToParamMap({ id: '0' }));
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('network down');
  });
});
