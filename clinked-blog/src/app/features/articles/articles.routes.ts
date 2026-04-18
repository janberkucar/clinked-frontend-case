import { Routes } from '@angular/router';

import { articleCreateCanDeactivateGuard } from './create/article-create.can-deactivate';

export const ARTICLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/article-list.page').then((m) => m.ArticleListPage),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create/article-create.page').then((m) => m.ArticleCreatePage),
    canDeactivate: [articleCreateCanDeactivateGuard],
  },
  {
    path: 'article/:id',
    loadComponent: () =>
      import('./detail/article-detail.page').then((m) => m.ArticleDetailPage),
    children: [
      {
        path: 'comments',
        outlet: 'side',
        loadComponent: () =>
          import('./comments/comment-list.component').then(
            (m) => m.CommentListComponent,
          ),
      },
    ],
  },
];
