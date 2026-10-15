import { Injectable } from '@nestjs/common';
import type { ServerEvent } from '@pecan/shared';
import { Subject } from 'rxjs';

@Injectable()
export class RealtimeEvents {
  private readonly events = new Subject<ServerEvent>();

  readonly events$ = this.events.asObservable();

  publish(event: ServerEvent): void {
    this.events.next(event);
  }
}
