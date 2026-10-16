import { RealtimeActions } from '../realtime.actions';
import { connectionFeature } from './connection.feature';
import type { ConnectionState } from './connection.feature';

const reduce = (...actions: Parameters<typeof connectionFeature.reducer>[1][]): ConnectionState =>
  actions.reduce(
    connectionFeature.reducer,
    connectionFeature.reducer(undefined, { type: '@@init' }),
  );

describe('connection feature', () => {
  it('goes from connecting to online', () => {
    expect(reduce(RealtimeActions.connecting({ attempt: 0 })).status).toBe('connecting');
    expect(
      reduce(RealtimeActions.connecting({ attempt: 0 }), RealtimeActions.opened()).status,
    ).toBe('online');
  });

  it('shows reconnecting after a drop, with the retry delay', () => {
    const state = reduce(
      RealtimeActions.opened(),
      RealtimeActions.closed({ retryInMs: 2000 }),
      RealtimeActions.connecting({ attempt: 1 }),
    );
    expect(state.status).toBe('reconnecting');
  });

  it('stays offline while the browser has no network', () => {
    const state = reduce(
      RealtimeActions.opened(),
      RealtimeActions.browserOffline(),
      RealtimeActions.closed({ retryInMs: 4000 }),
    );
    expect(state).toMatchObject({ status: 'offline', retryInMs: 4000 });
  });
});
