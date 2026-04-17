import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-comment-list',
  imports: [RouterLink],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentListComponent {
  protected readonly relativeTo: ActivatedRoute;

  constructor(private readonly route: ActivatedRoute) {
    this.relativeTo = this.route.parent ?? this.route;
  }
}
