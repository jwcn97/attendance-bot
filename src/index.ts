import * as dotenv from 'dotenv';
dotenv.config();

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import TelegramBot from 'node-telegram-bot-api';
import Calendar from 'telegram-inline-calendar';
import eventHandler from './eventHandler';
import { preparePrompt, handleChineseCharacters } from './utils';

import type { Message } from 'node-telegram-bot-api';

// TODO: integrate with dynamoDB
// (async () => {
//   const client = new DynamoDB({ region: "ap-southeast-1" });
//   try {
//     const results = await client.listTables({});
//     console.log(results.TableNames.join("\n"));
//   } catch (err) {
//     console.error(err);
//   }
// })();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const calendar = new Calendar(bot, {
  date_format: 'DD-MMM-YYYY HH:mm',
  start_date: 'now',
  time_selector_mod: true,
  language: 'en'
});

// async function handleChatCompletion(
//   msg: Message,
//   prompt: string
// ): Promise<void> {
//   const { from, chat } = msg;
//   const { message_id: messageId } = await bot.sendMessage(chat.id, '💭...⌛');

//   const { data, errorMsg } = await fetchChatCompletion({ chatId: chat.id });

//   const { choices = [] } = data || {};
//   bot.editMessageText(choices?.[0]?.message?.content, {
//     parse_mode: 'Markdown',
//     chat_id: chat.id,
//     message_id: messageId,
//   });
// }

bot.setMyCommands(
  [
    {
      command: '/addevent',
      description: 'Add new event',
    },
    {
      command: '/addparticipant',
      description: 'Add new participant',
    },
    {
      command: '/removeparticipant',
      description: 'Remove participant',
    },
    {
      command: '/removeevent',
      description: 'Remove event',
    },
  ],
  {
    scope: {
      type: 'all_private_chats',
    },
  }
);

bot.on('message', async (msg: Message) => {
  const { command, prompt } = preparePrompt(msg);
  if (!command) return;
  console.log('\nCOMMAND:', command, '\nPROMPT:', prompt);

  switch (command) {
    case 'addevent':
      calendar.startNavCalendar(msg);
      // const datePromt = await bot.sendMessage(msg.chat.id, "Date?", {
      //   reply_markup: {
      //     force_reply: true,
      //   },
      // });
      // bot.onReplyToMessage(msg.chat.id, datePromt.message_id, async (dateText) => {
      //   const date = dateText.text;
      //   // save name in DB if you want to ...
      //   await bot.sendMessage(msg.chat.id, `Hello ${date}!`);
      // });
      break;
    case 'addparticipant':
      break;
    case 'removeparticipant':
      break;
    case 'removeevent':
      break;
    case 'default':
      bot.sendMessage(msg.chat.id, 'test');
      break;
    default:
      break;
  }
});

bot.on("callback_query", (query) => {
  if (query.message.message_id == calendar.chats.get(query.message.chat.id)) {
    const res = calendar.clickButtonCalendar(query);
    if (res !== -1) {
      const [date, time] = res.split(' ');
      const event = { title: 'test', date, time, location: 'test' }
      eventHandler.addEvent({ title: 'test', date, time, location: 'test' });
      bot.sendMessage(query.message.chat.id, "You selected: " + event);
    }
  }
});
