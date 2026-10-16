import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Placeholder rows with the exact height of the real ones, so nothing jumps when data arrives. */
@Component({
  selector: 'app-skeleton-rows',
  template: `
    @for (row of rows(); track row) {
      <div class="row" [style.height.px]="height()">
        <div class="bar wide"></div>
        <div class="bar narrow"></div>
      </div>
    }
  `,
  styles: `
    .row {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      padding: 0 8px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .bar {
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(
        90deg,
        var(--mat-sys-surface-container-high) 25%,
        var(--mat-sys-surface-container-highest) 50%,
        var(--mat-sys-surface-container-high) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.2s linear infinite;
    }
    .wide {
      width: 60%;
    }
    .narrow {
      width: 35%;
    }
    @keyframes shimmer {
      to {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
  host: { 'aria-busy': 'true', 'aria-label': 'Loading' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonRows {
  readonly count = input(10);
  readonly height = input(72);
  protected readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
