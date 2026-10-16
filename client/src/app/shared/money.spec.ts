import { centsToInput, formatMoney, parseMoney } from './money';

describe('money', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['$ 0.99', 99],
    [' 7.05 ', 705],
  ])('parses %j as %i cents', (text, cents) => {
    expect(parseMoney(text)).toBe(cents);
  });

  it.each(['', 'abc', '12.345', '-5', '1,000'])('rejects %j', (text) => {
    expect(parseMoney(text)).toBeNull();
  });

  it('avoids floating-point drift', () => {
    expect(parseMoney('0.29')).toBe(29);
    expect(parseMoney('1.15')).toBe(115);
  });

  it('formats cents as dollars', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
  });

  it('turns cents back into input text', () => {
    expect(centsToInput(1205)).toBe('12.05');
    expect(centsToInput(null)).toBe('');
  });
});
