/* Core Imports */
import { ChangeDetectionStrategy, Component } from '@angular/core';
/* Router Imports */
import { RouterOutlet } from '@angular/router';
import { ClinkedMarketingBlocksComponent } from './shared/components/marketing/clinked-marketing-blocks.component';
import { SiteHeaderComponent } from './shared/components/site-header/site-header.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    SiteHeaderComponent,
    ClinkedMarketingBlocksComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
