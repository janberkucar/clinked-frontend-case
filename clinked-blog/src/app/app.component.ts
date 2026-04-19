/* Core Imports */
import { ChangeDetectionStrategy, Component } from '@angular/core';
/* Router Imports */
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly appName = 'Clinked blog';
}
