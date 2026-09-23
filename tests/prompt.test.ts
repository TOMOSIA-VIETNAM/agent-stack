import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import type { InspectedTarget } from '../src/emit.js';
import {
  approvedOverwrites,
  initialState,
  parseKey,
  reduce,
  rejected,
  render,
  runPicker,
  splitKeys,
  type PickerState,
} from '../src/prompt.js';

const targets: InspectedTarget[] = [
  { id: 'test', type: 'command', path: '.claude/commands/test.md', state: 'new' },
  { id: 'rails-ruby', type: 'rule', path: '.claude/rules/rails-ruby.md', state: 'exists' },
  { id: 'rails-conventions', type: 'rule', path: '.claude/rules/rails-conventions.md', state: 'owned' },
  { id: 'rails-feature', type: 'skill', path: '.claude/skills/rails-feature', state: 'new' },
  { id: 'preamble', type: 'claude-md', state: 'new' },
];

/** Drive the picker the way a keyboard would, one key at a time. */
function press(state: PickerState, ...keys: string[]): PickerState {
  return keys.reduce((current, key) => {
    const action = parseKey(key);
    return action === undefined ? current : reduce(current, action);
  }, state);
}

describe('the approval checklist', () => {
  it('groups by type and ticks everything the project does not already have', () => {
    const state = initialState(targets);

    expect(state.items.map((item) => item.id)).toEqual([
      'rails-conventions',
      'rails-ruby',
      'rails-feature',
      'test',
      'preamble',
    ]);
    expect(state.items.filter((item) => !item.checked).map((item) => item.id)).toEqual([
      'rails-ruby',
    ]);
  });

  // The whole point of the default: a file the project wrote itself is never
  // carried off by a run nobody looked at.
  it('leaves an existing file unticked until it is ticked by hand', () => {
    const state = initialState(targets);
    expect(rejected(state).map((item) => item.id)).toEqual(['rails-ruby']);
    expect(approvedOverwrites(state)).toEqual([]);

    const ticked = press(state, 'j', ' ');
    expect(rejected(ticked)).toEqual([]);
    expect(approvedOverwrites(ticked).map((item) => item.id)).toEqual(['rails-ruby']);
  });

  it('leaves a file edited since the last run unticked, and says why', () => {
    const edited: InspectedTarget[] = [
      { id: 'rails-ruby', type: 'rule', path: '.claude/rules/rails-ruby.md', state: 'modified' },
    ];
    const state = initialState(edited);

    expect(rejected(state).map((item) => item.id)).toEqual(['rails-ruby']);
    expect(render(state).join('\n')).toContain('edited since the last run');
    expect(approvedOverwrites(press(state, ' ')).map((item) => item.id)).toEqual(['rails-ruby']);
  });

  it('ticks an existing file up front only when --overwrite asked for it', () => {
    const state = initialState(targets, { overwrite: true });
    expect(rejected(state)).toEqual([]);
    expect(approvedOverwrites(state).map((item) => item.id)).toEqual(['rails-ruby']);
  });

  it('toggles a whole group with one key, and turns it off again', () => {
    const rules = (state: PickerState) =>
      state.items.filter((item) => item.type === 'rule').map((item) => item.checked);

    // The cursor starts on a rule, and the group is only half ticked.
    const on = press(initialState(targets), 'g');
    expect(rules(on)).toEqual([true, true]);
    expect(rules(press(on, 'g'))).toEqual([false, false]);
    // Nothing outside the group moved.
    expect(on.items.filter((item) => item.type !== 'rule').every((item) => item.checked)).toBe(
      true,
    );
  });

  it('takes all and none, and wraps the cursor at both ends', () => {
    const none = press(initialState(targets), 'n');
    expect(none.items.every((item) => item.checked)).toBe(false);
    expect(press(none, 'a').items.every((item) => item.checked)).toBe(true);

    expect(press(initialState(targets), 'k').cursor).toBe(targets.length - 1);
    expect(press(initialState(targets), '\u001b[B', '\u001b[A').cursor).toBe(0);
  });

  it('settles on confirm or cancel, and ignores keys afterwards', () => {
    const confirmed = press(initialState(targets), '\r');
    expect(confirmed.status).toBe('confirmed');
    expect(press(confirmed, 'n')).toEqual(confirmed);

    expect(press(initialState(targets), 'q').status).toBe('cancelled');
    expect(press(initialState(targets), '\u0003').status).toBe('cancelled');
    expect(press(initialState(targets), '\u001b').status).toBe('cancelled');
  });

  it('reads an arrow key as one key and a burst of letters as several', () => {
    expect(splitKeys('\u001b[A')).toEqual(['\u001b[A']);
    expect(splitKeys('an')).toEqual(['a', 'n']);
    expect(parseKey('z')).toBeUndefined();
  });
});

describe('rendering the checklist', () => {
  it('names every artifact, where it lands, and what is already there', () => {
    const text = render(initialState(targets), 40).join('\n');

    expect(text).toContain('.claude/rules/rails-ruby.md');
    expect(text).toContain('already in the project');
    expect(text).toContain('inlined into CLAUDE.md');
    expect(text).toContain('4 of 5 selected');
    expect(text).toContain('1 left untouched because the project has or edited them');
  });

  // A knowledge base of forty artifacts must not scroll its own header away.
  it('windows a long list around the cursor and says what is off screen', () => {
    const many: InspectedTarget[] = Array.from({ length: 60 }, (_, index) => ({
      id: `rule-${String(index).padStart(2, '0')}`,
      type: 'rule' as const,
      path: `.claude/rules/rule-${index}.md`,
      state: 'new' as const,
    }));
    const lines = render(press(initialState(many), ...Array(30).fill('j')), 20);

    expect(lines.length).toBeLessThanOrEqual(20);
    expect(lines.join('\n')).toContain('more above');
    expect(lines.join('\n')).toContain('more below');
  });
});

/** A terminal, as far as the picker is concerned: raw mode plus a key stream. */
function fakeTty() {
  const input = new EventEmitter() as unknown as NodeJS.ReadStream;
  const written: string[] = [];
  Object.assign(input, {
    isTTY: true,
    isRaw: false,
    setRawMode(raw: boolean) {
      (this as { isRaw: boolean }).isRaw = raw;
      return this;
    },
    setEncoding() {
      return input;
    },
    resume() {
      return input;
    },
    pause() {
      return input;
    },
  });
  const output = {
    isTTY: true,
    rows: 30,
    write(chunk: string) {
      written.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WriteStream;

  return { io: { input, output }, written, type: (keys: string) => input.emit('data', keys) };
}

describe('driving the checklist from a terminal', () => {
  it('redraws on every key and settles on enter', async () => {
    const { io, written, type } = fakeTty();
    const running = runPicker(targets, io);
    // The first frame is already out before a key is pressed.
    expect(written.length).toBe(1);

    type('j');
    type(' ');
    type('\r');

    const state = await running;
    expect(state.status).toBe('confirmed');
    expect(approvedOverwrites(state).map((item) => item.id)).toEqual(['rails-ruby']);
    expect(written.length).toBeGreaterThan(1);
    expect(io.input.isRaw).toBe(false);
  });

  it('hands back a cancel without a selection', async () => {
    const { io, type } = fakeTty();
    const running = runPicker(targets, io);
    type('q');

    expect((await running).status).toBe('cancelled');
  });

  it('starts from --overwrite when it was asked for', async () => {
    const { io, type } = fakeTty();
    const running = runPicker(targets, io, { overwrite: true });
    type('\r');

    expect(rejected(await running)).toEqual([]);
  });
});
