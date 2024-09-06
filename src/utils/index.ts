import type { Message } from 'node-telegram-bot-api';

const BOT_USERNAME = '@hendry_attendance_bot';

export function preparePrompt({ text, entities = [] }: Message): {
  command?: string;
  prompt?: string;
} {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    // bot-commands
    if (entity.type === 'bot_command') {
      return {
        command: text
          .slice(entity.offset + 1, entity.offset + entity.length)
          .replace(BOT_USERNAME, ''),
        prompt:
          text.substring(0, entity.offset) +
          text.substring(entity.offset + 1).replace(BOT_USERNAME, ''),
      };
    }
  }
  // invalid commands
  return {};
}

export function handleChineseCharacters(str: string): string {
  if (
    /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g.test(
      str
    )
  ) {
    return 'name';
  }
  return str;
}

export function chunkArray(array: Array<any>, size = 2) {
  const chunkedArray = []
  for (var i = 0; i < array.length; i += size) {
   chunkedArray.push(array.slice(i, i + size))
  }
  return chunkedArray
}
