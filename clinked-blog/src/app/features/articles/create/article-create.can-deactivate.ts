/* Router Imports */
import type { CanDeactivateFn } from '@angular/router';
/* Feature Imports */
import { ArticleCreatePage } from './article-create.page';

export const articleCreateCanDeactivateGuard: CanDeactivateFn<
  ArticleCreatePage
> = (component) => component.confirmDeactivate();
