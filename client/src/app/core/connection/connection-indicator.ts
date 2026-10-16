import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { connectionFeature } from '../../state/connection/connection.feature';
import type { ConnectionStatus } from '../../state/connection/connection.feature';

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting',
  online: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

@Component({
  selector: 'app-connection-indicator',
  template: `
    <span class="dot" [attr.data-status]="status()"></span>
    <span class="label">{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: var(--mat-sys-label-large);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--mat-sys-outline);
    }
    .dot[data-status='online'] {
      background: #2e7d32;
    }
    .dot[data-status='reconnecting'],
    .dot[data-status='connecting'] {
      background: #f9a825;
    }
    .dot[data-status='offline'] {
      background: var(--mat-sys-error);
    }
  `,
  host: { role: 'status', '[attr.aria-label]': '"Connection: " + label()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionIndicator {
  protected readonly status = inject(Store).selectSignal(connectionFeature.selectStatus);
  protected readonly label = computed(() => LABELS[this.status()]);
}
