/* Core Imports */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
/* Forms Imports */
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
/* Router Imports */
import { Router, RouterLink } from '@angular/router';
/* RxJS Imports */
import { finalize } from 'rxjs';
/* DTO Imports */
import type { CreateArticlePayload } from '../../../core/api/dto/article.dto';
/* API Imports */
import { ArticleApiService } from '../../../core/api/services/article-api.service';
/* Model Imports */
import {
  ARTICLE_CATEGORY_OPTIONS,
  type ArticleCategory,
} from '../../../shared/models/article.category';

@Component({
  selector: 'app-article-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './article-create.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCreatePage {
  private readonly api = inject(ArticleApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly categoryOptions = ARTICLE_CATEGORY_OPTIONS;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(101)],
    }),
    content: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    category: new FormControl<ArticleCategory | ''>('', {
      nonNullable: true,
    }),
  });

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }
    this.submitError.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { title, content, category } = this.form.getRawValue();
    const payload: CreateArticlePayload = {
      title,
      content,
      ...(category !== '' ? { category } : {}),
    };

    this.submitting.set(true);
    this.api
      .createArticle(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (article) => {
          this.form.reset(
            { title: '', content: '', category: '' },
            { emitEvent: false },
          );
          void this.router.navigate(['/article', article.id]);
        },
        error: () => {
          this.submitError.set(
            'Could not create the article. Please try again.',
          );
        },
      });
  }

  confirmDeactivate(): boolean {
    if (!this.form.dirty) {
      return true;
    }
    return window.confirm(
      'You have unsaved changes. Leave this page and discard them?',
    );
  }
}
