import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';
import type { Cents } from '@pecan/shared';
import { formatMoney } from './money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: Cents | null | undefined): string {
    return cents === null || cents === undefined ? '' : formatMoney(cents);
  }
}
