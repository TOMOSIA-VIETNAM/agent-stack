import type { InspectedTarget, TargetState } from './emit.js';
import { artifactKey } from './selector.js';
import type { ArtifactType } from './schema.js';

/**
 * The approval step: a checklist of everything a run would write, ticked by the
 * operator before a single file moves.
 *
 * Only the terminal lives here. The state is a plain value and every keystroke
 * is a pure transition on it, so what the operator approved can be tested
 * without a terminal at all — and the run that follows still goes through the
 * same resolver, selector and emitter as an unattended one.
 */
export interface PickerItem {
  key: string;
  id: string;
  type: ArtifactType;
  /** Where it lands; absent for a fragment, which is spliced into CLAUDE.md. */
  path?: string;
  state: TargetState;
  checked: boolean;
}

export interface PickerState {
  items: PickerItem[];
  cursor: number;
  status: 'open' | 'confirmed' | 'cancelled';
}

export type PickerKey =
  | 'up'
  | 'down'
  | 'toggle'
  | 'all'
  | 'none'
  | 'group'
  | 'confirm'
  | 'cancel';

const TYPE_ORDER: ArtifactType[] = ['rule', 'skill', 'command', 'claude-md'];

const TYPE_LABEL: Record<ArtifactType, string> = {
  rule: 'Rules',
  skill: 'Skills',
  command: 'Commands',
  'claude-md': 'CLAUDE.md fragments',
};

const STATE_NOTE: Record<TargetState, string> = {
  new: '',
  owned: 'replaces the last run',
  exists: 'already in the project',
};

/**
 * Everything starts ticked except a path the project already has. That default
 * is the whole point: an existing file is never carried away by a run the
 * operator did not look at.
 */
export function initialState(
  targets: InspectedTarget[],
  options: { overwrite?: boolean } = {},
): PickerState {
  const items = [...targets]
    .sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.id.localeCompare(b.id),
    )
    .map((target) => ({
      key: artifactKey(target),
      id: target.id,
      type: target.type,
      path: target.path,
      state: target.state,
      checked: options.overwrite === true || target.state !== 'exists',
    }));

  return { items, cursor: 0, status: 'open' };
}

export function reduce(state: PickerState, key: PickerKey): PickerState {
  if (state.status !== 'open') return state;
  const { items, cursor } = state;
  const count = items.length;

  const set = (predicate: (item: PickerItem, index: number) => boolean, checked: boolean) => ({
    ...state,
    items: items.map((item, index) =>
      predicate(item, index) ? { ...item, checked } : item,
    ),
  });

  switch (key) {
    case 'up':
      return count === 0 ? state : { ...state, cursor: (cursor - 1 + count) % count };
    case 'down':
      return count === 0 ? state : { ...state, cursor: (cursor + 1) % count };
    case 'toggle': {
      const current = items[cursor];
      return current === undefined ? state : set((_, i) => i === cursor, !current.checked);
    }
    case 'all':
      return set(() => true, true);
    case 'none':
      return set(() => true, false);
    case 'group': {
      const current = items[cursor];
      if (current === undefined) return state;
      const group = items.filter((item) => item.type === current.type);
      // One key for a whole group, because a run is usually "all the rules, none
      // of the commands" rather than a walk down forty lines.
      return set((item) => item.type === current.type, !group.every((item) => item.checked));
    }
    case 'confirm':
      return { ...state, status: 'confirmed' };
    case 'cancel':
      return { ...state, status: 'cancelled' };
  }
}

export function parseKey(chunk: string): PickerKey | undefined {
  switch (chunk) {
    case '\u001b[A':
    case 'k':
      return 'up';
    case '\u001b[B':
    case 'j':
      return 'down';
    case ' ':
      return 'toggle';
    case 'a':
      return 'all';
    case 'n':
      return 'none';
    case 'g':
      return 'group';
    case '\r':
    case '\n':
      return 'confirm';
    case '\u0003':
    case '\u001b':
    case 'q':
      return 'cancel';
    default:
      return undefined;
  }
}

/** An escape sequence arrives whole; anything else is read one key at a time. */
export function splitKeys(chunk: string): string[] {
  return chunk.startsWith('\u001b[') ? [chunk] : [...chunk];
}

/** The ids the operator did not tick, keyed as `type:id`. */
export function rejected(state: PickerState): PickerItem[] {
  return state.items.filter((item) => !item.checked);
}

/** Ticked although the project already has the file — an explicit overwrite. */
export function approvedOverwrites(state: PickerState): PickerItem[] {
  return state.items.filter((item) => item.checked && item.state === 'exists');
}

const DIM = '\u001b[2m';
const BOLD = '\u001b[1m';
const RESET = '\u001b[0m';

function itemLine(item: PickerItem, focused: boolean): string {
  const box = item.checked ? '[x]' : '[ ]';
  const note = STATE_NOTE[item.state];
  const where = item.path ?? 'inlined into CLAUDE.md';
  const trailer = note === '' ? where : `${where} — ${note}`;
  const body = `${box} ${item.id.padEnd(28)} ${DIM}${trailer}${RESET}`;
  return focused ? `${BOLD}>${RESET} ${body}` : `  ${body}`;
}

/**
 * The checklist, windowed to the terminal so a long knowledge base scrolls
 * rather than spilling off the top.
 */
export function render(state: PickerState, rows = 24): string[] {
  // A pty can report no height at all, and a three-line window is unusable.
  const height = rows > 0 ? rows : 24;
  const body: string[] = [];
  let focusedLine = 0;
  let lastType: ArtifactType | undefined;

  state.items.forEach((item, index) => {
    if (item.type !== lastType) {
      const total = state.items.filter((other) => other.type === item.type).length;
      if (lastType !== undefined) body.push('');
      body.push(`${BOLD}${TYPE_LABEL[item.type]}${RESET} ${DIM}(${total})${RESET}`);
      lastType = item.type;
    }
    if (index === state.cursor) focusedLine = body.length;
    body.push(itemLine(item, index === state.cursor));
  });

  const chosen = state.items.filter((item) => item.checked).length;
  const held = state.items.filter((item) => !item.checked && item.state === 'exists').length;
  const header = [
    `${BOLD}Choose what to write into .claude/${RESET}`,
    `${DIM}space toggle · g group · a all · n none · ↑↓/jk move · enter write · q cancel${RESET}`,
    '',
  ];
  const footer = [
    '',
    `${chosen} of ${state.items.length} selected` +
      (held > 0 ? `, ${held} left untouched because the project already has them` : ''),
  ];

  const room = Math.max(3, height - header.length - footer.length - 1);
  if (body.length <= room) return [...header, ...body, ...footer];

  // Keep the focused line inside the window, and never scroll past the end.
  const start = Math.min(
    Math.max(0, focusedLine - Math.floor(room / 2)),
    body.length - room,
  );
  const window = body.slice(start, start + room);
  if (start > 0) window[0] = `${DIM}  … ${start} more above${RESET}`;
  const below = body.length - (start + room);
  if (below > 0) window[window.length - 1] = `${DIM}  … ${below} more below${RESET}`;
  return [...header, ...window, ...footer];
}

export interface PickerIo {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
}

/** A picker needs a keyboard on one end and a screen on the other. */
export function isInteractive(io: PickerIo): boolean {
  return Boolean(io.input.isTTY && io.output.isTTY && typeof io.input.setRawMode === 'function');
}

export async function runPicker(
  targets: InspectedTarget[],
  io: PickerIo,
  options: { overwrite?: boolean } = {},
): Promise<PickerState> {
  let state = initialState(targets, options);
  const { input, output } = io;
  let drawn = 0;

  const draw = () => {
    if (drawn > 0) output.write(`\u001b[${drawn}A\u001b[0J`);
    const lines = render(state, output.rows ?? 0);
    output.write(`${lines.join('\n')}\n`);
    drawn = lines.length;
  };

  const previousRaw = input.isRaw === true;
  input.setRawMode(true);
  input.setEncoding('utf8');
  input.resume();
  draw();

  try {
    await new Promise<void>((settle) => {
      const onData = (chunk: string) => {
        for (const key of splitKeys(chunk)) {
          const action = parseKey(key);
          if (action === undefined) continue;
          state = reduce(state, action);
          if (state.status !== 'open') {
            input.off('data', onData);
            settle();
            return;
          }
        }
        draw();
      };
      input.on('data', onData);
    });
  } finally {
    input.setRawMode(previousRaw);
    input.pause();
  }

  draw();
  return state;
}
