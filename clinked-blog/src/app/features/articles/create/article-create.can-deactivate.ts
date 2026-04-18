import type { CanDeactivateFn } from '@angular/router';

import { ArticleCreatePage } from './article-create.page';

export const articleCreateCanDeactivateGuard: CanDeactivateFn<
  ArticleCreatePage
> = (component) => component.confirmDeactivate();
