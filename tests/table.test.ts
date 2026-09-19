import { describe, expect, it } from 'vitest';
import { renderTable } from '../src/table.js';

describe('renderTable', () => {
  it('sizes every column to its widest cell, header included', () => {
    const out = renderTable(
      [{ header: 'id' }, { header: 'name' }],
      [
        ['rails', 'Ruby on Rails'],
        ['laravel', 'Laravel'],
      ],
    );

    expect(out.split('\n')).toEqual([
      '  ┌─────────┬───────────────┐',
      '  │ id      │ name          │',
      '  ├─────────┼───────────────┤',
      '  │ rails   │ Ruby on Rails │',
      '  │ laravel │ Laravel       │',
      '  └─────────┴───────────────┘',
    ]);
  });

  // A blank cell should read as "nothing here", not as a rendering slip.
  it('shows an empty cell as an em dash', () => {
    const out = renderTable([{ header: 'aliases' }], [[''], ['  '], ['ror']]);
    expect(out).toContain('│ —       │');
    expect(out).toContain('│ ror     │');
  });

  it('right-aligns a column when asked', () => {
    const out = renderTable(
      [{ header: 'content', align: 'right' }],
      [['6 artifact(s)'], ['none yet']],
    );
    expect(out).toContain('│      none yet │');
    expect(out).toContain('│ 6 artifact(s) │');
  });

  it('keeps its shape with no rows at all', () => {
    expect(renderTable([{ header: 'id' }], []).split('\n')).toEqual([
      '  ┌────┐',
      '  │ id │',
      '  ├────┤',
      '  └────┘',
    ]);
  });
});
