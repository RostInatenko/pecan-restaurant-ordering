import { Injectable, Injector, inject } from '@angular/core';
import type { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Loads the snackbar (and its overlay code) on first use instead of in the initial bundle: it is
 * needed by root-level effects, but only once something actually happens.
 */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly injector = inject(Injector);
  private snackBar?: Promise<MatSnackBar>;

  success(message: string): void {
    void this.open(message, undefined, { duration: 3000 });
  }

  error(message: string): void {
    void this.open(message, 'Dismiss', { duration: 6000, politeness: 'assertive' });
  }

  private async open(message: string, action: string | undefined, config: MatSnackBarConfig) {
    this.snackBar ??= import('@angular/material/snack-bar').then((m) =>
      this.injector.get(m.MatSnackBar),
    );
    (await this.snackBar).open(message, action, config);
  }
}
