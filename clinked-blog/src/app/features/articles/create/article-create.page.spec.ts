import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';

import { ArticleApiService } from '../../../core/api/services/article-api.service';
import type { Article } from '../../../shared/models/article.model';
import { articleCreateCanDeactivateGuard } from './article-create.can-deactivate';
import { ArticleCreatePage } from './article-create.page';

const emptyRoute = {} as ActivatedRouteSnapshot;
const emptyState = {} as RouterStateSnapshot;
const emptyNextState = {} as RouterStateSnapshot;

function runDeactivateGuard(cmp: ArticleCreatePage): boolean {
  const result = articleCreateCanDeactivateGuard(
    cmp,
    emptyRoute,
    emptyState,
    emptyNextState,
  );
  return result === true;
}

describe('ArticleCreatePage', () => {
  let fixture: ComponentFixture<ArticleCreatePage>;
  let createSpy: jasmine.Spy;

  const createdArticle: Article = {
    id: 'new-article-id',
    title: 'Saved title',
    content: 'Saved body',
    category: 'Cats',
    publishedDate: '2026-04-18T12:00:00.000Z',
    commentCount: 0,
  };

  beforeEach(async () => {
    createSpy = jasmine
      .createSpy('createArticle')
      .and.returnValue(of(createdArticle));

    await TestBed.configureTestingModule({
      imports: [ArticleCreatePage],
      providers: [
        provideRouter([
          { path: 'create', component: ArticleCreatePage },
          { path: 'article/:id', component: ArticleCreatePage },
        ]),
        {
          provide: ArticleApiService,
          useValue: { createArticle: createSpy },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleCreatePage);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('form validation', () => {
    it('marks title as required after submit attempt with empty fields', () => {
      fixture.detectChanges();
      fixture.componentInstance.onSubmit();
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Title is required.');
      expect(el.textContent).toContain('Content is required.');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('rejects title longer than 101 characters', () => {
      fixture.detectChanges();
      const cmp = fixture.componentInstance;
      cmp.form.controls.title.setValue('x'.repeat(102));
      cmp.form.controls.content.setValue('ok');
      cmp.onSubmit();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Title must be at most 101 characters.',
      );
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('accepts title of exactly 101 characters with valid content', () => {
      fixture.detectChanges();
      const cmp = fixture.componentInstance;
      cmp.form.controls.title.setValue('x'.repeat(101));
      cmp.form.controls.content.setValue('body');
      cmp.onSubmit();
      fixture.detectChanges();

      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('articleCreateCanDeactivateGuard', () => {
    it('allows navigation when the form is pristine', () => {
      fixture.detectChanges();
      const cmp = fixture.componentInstance;
      const confirmSpy = spyOn(window, 'confirm');

      expect(runDeactivateGuard(cmp)).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('blocks navigation when the form is dirty and the user cancels', () => {
      fixture.detectChanges();
      const cmp = fixture.componentInstance;
      cmp.form.controls.title.setValue('x');
      spyOn(window, 'confirm').and.returnValue(false);

      expect(runDeactivateGuard(cmp)).toBe(false);
    });

    it('allows navigation when the form is dirty and the user confirms', () => {
      fixture.detectChanges();
      const cmp = fixture.componentInstance;
      cmp.form.controls.title.setValue('x');
      spyOn(window, 'confirm').and.returnValue(true);

      expect(runDeactivateGuard(cmp)).toBe(true);
    });
  });

  describe('successful submit', () => {
    it('calls createArticle without publishedDate, then navigates to the new article', () => {
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navSpy = spyOn(router, 'navigate').and.returnValue(
        Promise.resolve(true),
      );

      const cmp = fixture.componentInstance;
      cmp.form.patchValue({
        title: 'My title',
        content: 'My content',
        category: 'Dogs',
      });
      cmp.onSubmit();
      fixture.detectChanges();

      expect(createSpy).toHaveBeenCalledTimes(1);
      const payload = createSpy.calls.mostRecent().args[0] as Record<
        string,
        unknown
      >;
      expect('publishedDate' in payload).toBeFalse();
      expect(payload).toEqual({
        title: 'My title',
        content: 'My content',
        category: 'Dogs',
      });
      expect(navSpy).toHaveBeenCalledWith(['/article', 'new-article-id']);
    });

    it('omits category when None is selected', () => {
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      const cmp = fixture.componentInstance;
      cmp.form.patchValue({
        title: 'T',
        content: 'C',
        category: '',
      });
      cmp.onSubmit();
      fixture.detectChanges();

      expect(createSpy).toHaveBeenCalledWith({
        title: 'T',
        content: 'C',
      });
    });

    it('does not call createArticle twice while a submission is in flight', () => {
      createSpy.and.returnValue(NEVER);
      fixture.detectChanges();
      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
        Promise.resolve(true),
      );

      const cmp = fixture.componentInstance;
      cmp.form.patchValue({ title: 'T', content: 'C', category: '' });
      cmp.onSubmit();
      cmp.onSubmit();
      fixture.detectChanges();

      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    it('sets submit error and does not navigate when createArticle fails', () => {
      createSpy.and.returnValue(throwError(() => new Error('network')));
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navSpy = spyOn(router, 'navigate');

      const cmp = fixture.componentInstance;
      cmp.form.patchValue({ title: 'T', content: 'C', category: '' });
      cmp.onSubmit();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Could not create the article',
      );
      expect(navSpy).not.toHaveBeenCalled();
    });
  });
});
