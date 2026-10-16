import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-setup-page',
  template: `<p>Setup</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPage {}
