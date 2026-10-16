import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-menu-page',
  template: `<p>Menu</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {}
