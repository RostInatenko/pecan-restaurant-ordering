import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { connectionFeature } from '../../state/connection/connection.feature';

/**
 * Fixed to the bottom of the screen so it never pushes content around. The app keeps working on
 * the last data it had; the next connection brings a fresh snapshot.
 */
@Component({
  selector: 'app-connection-banner',
  imports: [MatProgressSpinner],
  template: `
    @if (message(); as text) {
      <div class="banner" role="alert">
        <mat-spinner diameter="18" />
        <span>{{ text }}</span>
      </div>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: calc(100vw - 32px);
      padding: 10px 16px;
      border-radius: 8px;
      background: var(--mat-sys-inverse-surface);
      color: var(--mat-sys-inverse-on-surface);
      font: var(--mat-sys-body-medium);
      box-shadow: var(--mat-sys-level3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionBanner {
  private readonly store = inject(Store);
  private readonly status = this.store.selectSignal(connectionFeature.selectStatus);
  private readonly everConnected = this.store.selectSignal(connectionFeature.selectEverConnected);

  protected readonly message = computed(() => {
    switch (this.status()) {
      case 'offline':
        return "You're offline. Showing the last known menu; live updates resume when you reconnect.";
      case 'reconnecting':
        return this.everConnected()
          ? 'Connection lost. Reconnecting… Live updates are paused.'
          : "Can't reach the server yet. Retrying…";
      default:
        return null;
    }
  });
}
