import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-article-list',
  imports: [],
  templateUrl: './article-list.page.html',
  styleUrl: './article-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleListPage {

}
