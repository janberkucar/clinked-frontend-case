import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  of,
  Subject,
  switchMap,
  throwError,
  timer,
} from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Article } from '../../../shared/models/article.model';
import type { Comment } from '../../../shared/models/comment.model';
import { CommentListComponent } from './comment-list.component';

describe('CommentListComponent', () => {
  let fixture: ComponentFixture<CommentListComponent>;
  let parentParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let getCommentsSpy: jasmine.Spy;
  let getArticleByIdSpy: jasmine.Spy;
  let addCommentSpy: jasmine.Spy;
  let commentsChanged$: Subject<string>;

  const mockArticle: Article = {
    id: '0',
    title: 'Mock',
    content: 'Body',
    publishedDate: '2026-01-01T00:00:00.000Z',
    commentCount: 0,
  };

  const seedComment: Comment = {
    id: 'c-1',
    articleId: '0',
    content: 'Existing',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    parentParamMap$ = new BehaviorSubject(convertToParamMap({ id: '0' }));
    commentsChanged$ = new Subject<string>();
    getCommentsSpy = jasmine.createSpy('getComments');
    getArticleByIdSpy = jasmine.createSpy('getArticleById');
    addCommentSpy = jasmine.createSpy('addComment');

    getArticleByIdSpy.and.callFake((id: string) =>
      id === '0' ? of(mockArticle) : of(null),
    );
    getCommentsSpy.and.returnValue(of([seedComment]));
    addCommentSpy.and.callFake((articleId: string, content: string) => {
      commentsChanged$.next(articleId);
      return of<Comment>({
        id: 'c-new',
        articleId,
        content,
        createdAt: '2026-01-02T00:00:00.000Z',
      });
    });

    await TestBed.configureTestingModule({
      imports: [CommentListComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/article/0',
            events: EMPTY,
            routerState: {
              snapshot: { root: { paramMap: convertToParamMap({}), children: [] } },
            },
            navigate: jasmine
              .createSpy('navigate')
              .and.returnValue(Promise.resolve(true)),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
            parent: {
              paramMap: parentParamMap$.asObservable(),
              snapshot: {
                paramMap: convertToParamMap({ id: '0' }),
              },
            },
          },
        },
        {
          provide: ArticleApiService,
          useValue: {
            getArticleById: getArticleByIdSpy,
            getComments: getCommentsSpy,
            addComment: addCommentSpy,
            commentsChangedForArticle$: commentsChanged$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentListComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show loading then comments after getComments resolves', fakeAsync(() => {
    getCommentsSpy.and.returnValue(
      timer(15).pipe(switchMap(() => of([seedComment]))),
    );
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading comments');

    tick(20);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Existing');
    expect(getCommentsSpy).toHaveBeenCalledWith('0');
    expect(getArticleByIdSpy).toHaveBeenCalledWith('0');
  }));

  it('should show unavailable copy when the article does not exist', async () => {
    parentParamMap$.next(convertToParamMap({ id: 'missing-id' }));
    getArticleByIdSpy.and.callFake(() => of(null));
    fixture = TestBed.createComponent(CommentListComponent);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Article not found. Comments unavailable.',
    );
  });

  it('should call addComment with trimmed content and reset form on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.contentControl.setValue('New text');
    fixture.detectChanges();

    cmp.onSubmit();
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(addCommentSpy).toHaveBeenCalledWith('0', 'New text');
    expect(cmp.contentControl.value).toBe('');
  });

  it('uses parent route param id for addComment', async () => {
    parentParamMap$.next(convertToParamMap({ id: 'glue-id-no-slash-here' }));
    getArticleByIdSpy.and.callFake((id: string) =>
      id === 'glue-id-no-slash-here'
        ? of({ ...mockArticle, id: 'glue-id-no-slash-here' })
        : of(null),
    );
    getCommentsSpy.and.returnValue(of([]));
    fixture = TestBed.createComponent(CommentListComponent);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.contentControl.setValue('Hi');
    cmp.onSubmit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(addCommentSpy).toHaveBeenCalledWith('glue-id-no-slash-here', 'Hi');
  });

  it('should refetch comments when commentsChangedForArticle$ emits for current article', fakeAsync(() => {
    getCommentsSpy.and.returnValue(of([seedComment]));
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
    expect(getCommentsSpy).toHaveBeenCalledTimes(1);

    commentsChanged$.next('0');
    tick(0);
    fixture.detectChanges();
    expect(getCommentsSpy).toHaveBeenCalledTimes(2);
    expect(getCommentsSpy.calls.mostRecent().args[0]).toBe('0');
  }));

  it('shows an error when addComment fails', async () => {
    addCommentSpy.and.returnValue(throwError(() => new Error('network down')));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.contentControl.setValue('Hello');
    fixture.detectChanges();

    cmp.onSubmit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('network down');
  });

  it('does not close the panel when discard is cancelled', () => {
    const router = TestBed.inject(Router);
    const navSpy = router.navigate as jasmine.Spy;

    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.contentControl.setValue('draft text');
    cmp.contentControl.markAsDirty();
    spyOn(window, 'confirm').and.returnValue(false);

    cmp.attemptClose();
    fixture.detectChanges();

    expect(navSpy).not.toHaveBeenCalled();
  });
});
