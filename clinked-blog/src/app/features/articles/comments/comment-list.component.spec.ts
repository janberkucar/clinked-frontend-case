import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, of, Subject, switchMap, timer } from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Comment } from '../../../shared/models/comment.model';
import { CommentListComponent } from './comment-list.component';

describe('CommentListComponent', () => {
  let fixture: ComponentFixture<CommentListComponent>;
  let parentParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let getCommentsSpy: jasmine.Spy;
  let addCommentSpy: jasmine.Spy;
  const commentsChanged$ = new Subject<string>();

  const seedComment: Comment = {
    id: 'c-1',
    articleId: '0',
    content: 'Existing',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    parentParamMap$ = new BehaviorSubject(convertToParamMap({ id: '0' }));
    getCommentsSpy = jasmine.createSpy('getComments');
    addCommentSpy = jasmine.createSpy('addComment');

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
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
            parent: {
              snapshot: { paramMap: convertToParamMap({ id: '0' }) },
              paramMap: parentParamMap$.asObservable(),
            },
            paramMap: parentParamMap$.asObservable(),
          },
        },
        {
          provide: ArticleApiService,
          useValue: {
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
    expect(fixture.nativeElement.textContent).toContain('Loading comments');

    tick(20);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Existing');
    expect(getCommentsSpy).toHaveBeenCalledWith('0');
  }));

  it('should call addComment with trimmed content and reset form on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    cmp.contentControl.setValue('  New text  ');
    fixture.detectChanges();

    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    );
    btn?.click();
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(addCommentSpy).toHaveBeenCalledWith('0', 'New text');
    expect(cmp.contentControl.value).toBe('');
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
});
