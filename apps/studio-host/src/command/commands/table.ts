import { tableCommands as upstreamTableCommands } from '@upstream/command/commands/table';
import type { CommandDef, EditorContext } from '@upstream/command/types';

const canEnterCellSelection = (ctx: EditorContext) => ctx.inTable || ctx.inCellSelectionMode;

const hopTableCommands: CommandDef[] = [
  {
    id: 'table:cell-selection-enter',
    label: '셀 블록 선택',
    shortcutLabel: 'CmdOrCtrl+Alt+T',
    canExecute: canEnterCellSelection,
    execute(services) {
      services.getInputHandler()?.enterOrAdvanceCellSelectionMode();
    },
  },
];

const hopCommandIds = new Set(hopTableCommands.map((command) => command.id));

export const tableCommands: CommandDef[] = [
  ...hopTableCommands,
  ...upstreamTableCommands.filter((command) => !hopCommandIds.has(command.id)),
];
