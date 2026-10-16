import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConnectionBanner } from './core/connection/connection-banner';
import { ConnectionIndicator } from './core/connection/connection-indicator';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton,
    ConnectionIndicator,
    ConnectionBanner,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
