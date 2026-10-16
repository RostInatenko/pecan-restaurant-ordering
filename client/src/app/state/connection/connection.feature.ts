import { createFeature, createReducer, on } from '@ngrx/store';
import { RealtimeActions } from '../realtime.actions';

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline';

export interface ConnectionState {
  status: ConnectionStatus;
  retryInMs: number | null;
  everConnected: boolean;
}

const initialState: ConnectionState = {
  status: 'connecting',
  retryInMs: null,
  everConnected: false,
};

export const connectionFeature = createFeature({
  name: 'connection',
  reducer: createReducer(
    initialState,
    on(RealtimeActions.connecting, (state, { attempt }): ConnectionState => ({
      ...state,
      status: state.everConnected || attempt > 0 ? 'reconnecting' : 'connecting',
      retryInMs: null,
    })),
    on(RealtimeActions.opened, (): ConnectionState => ({
      status: 'online',
      retryInMs: null,
      everConnected: true,
    })),
    on(RealtimeActions.closed, (state, { retryInMs }): ConnectionState => ({
      ...state,
      status: state.status === 'offline' ? 'offline' : 'reconnecting',
      retryInMs,
    })),
    on(RealtimeActions.browserOffline, (state): ConnectionState => ({
      ...state,
      status: 'offline',
    })),
  ),
});
