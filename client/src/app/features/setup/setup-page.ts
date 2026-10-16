import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';
import { CategoriesTab } from './categories-tab';
import { ItemsTab } from './items-tab';
import { KitchenTab } from './kitchen-tab';

/**
 * Menu configuration. Every save goes to the server, and the result comes back to *all* open
 * tabs and devices over the WebSocket, which is how changes reach the Menu immediately.
 */
@Component({
  selector: 'app-setup-page',
  imports: [MatTabGroup, MatTab, MatTabContent, ItemsTab, CategoriesTab, KitchenTab],
  template: `
    <mat-tab-group class="setup-tabs" animationDuration="0ms">
      <mat-tab label="Items">
        <ng-template matTabContent><app-items-tab /></ng-template>
      </mat-tab>
      <mat-tab label="Categories">
        <ng-template matTabContent><app-categories-tab /></ng-template>
      </mat-tab>
      <mat-tab label="Kitchen">
        <ng-template matTabContent><app-kitchen-tab /></ng-template>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 16px;
      box-sizing: border-box;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPage {}
