import { editCommands as upstreamEditCommands } from '@upstream/command/commands/edit';
import type { CommandDef } from '@upstream/command/types';

type PasteCapableInputHandler = {
  performPaste?: () => void | Promise<void>;
};

const hopEditCommandById = new Map<string, CommandDef>([
  ['edit:paste', {
    id: 'edit:paste',
    label: '붙이기',
    icon: 'icon-paste',
    shortcutLabel: 'Ctrl+V',
    canExecute: (ctx) => ctx.hasDocument,
    execute(services) {
      void (services.getInputHandler() as PasteCapableInputHandler | null)?.performPaste?.();
    },
  }],
]);

export const editCommands: CommandDef[] = upstreamEditCommands.map((command) =>
  hopEditCommandById.get(command.id) ?? command,
);
