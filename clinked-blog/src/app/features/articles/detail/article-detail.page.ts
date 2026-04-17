import { ChangeDetectionStrategy, Component } from '@angular/core';

// Router Outlet import.
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-article-detail',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './article-detail.page.html',
  styleUrl: './article-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetailPage {}
