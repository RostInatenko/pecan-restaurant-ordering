import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: { connection: { status: 'online', retryInMs: null, everConnected: true } },
        }),
      ],
    }).compileComponents();
  });

  it('shows the navigation and the live connection status', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('nav a')).toHaveLength(3);
    expect(element.querySelector('app-connection-indicator')?.textContent).toContain('Live');
  });
});
