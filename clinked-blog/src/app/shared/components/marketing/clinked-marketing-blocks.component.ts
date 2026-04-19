import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Static Clinked-style promo blocks (newsletter, inline CTA, footer hero). No data binding. */
@Component({
  selector: 'app-clinked-marketing-blocks',
  standalone: true,
  templateUrl: './clinked-marketing-blocks.component.html',
  styleUrl: './clinked-marketing-blocks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinkedMarketingBlocksComponent {}
