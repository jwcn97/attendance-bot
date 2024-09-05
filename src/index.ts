import * as dotenv from 'dotenv';
dotenv.config();

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import TelegramBot from 'node-telegram-bot-api';
import Calendar from 'telegram-inline-calendar';
import eventHandler from './eventHandler';
import { convertToReadableDatetimeRange, getUnixTimestamp } from './datetime';
import { preparePrompt, handleChineseCharacters, chunkArray } from './utils';

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
  date_format: 'DD-MMM-YY HH:mm',
  start_week_day: 1,
  start_date: 'now',
  time_range: "14:00-20:59",
  time_selector_mod: true,
  language: 'en'
});

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
    case 'testcalendar':
      calendar.startNavCalendar(msg);
      break;
    case 'addevent':
      const titlePrompt = await bot.sendMessage(msg.chat.id, "Title?", {
        reply_markup: {
          force_reply: true,
        },
      });
      bot.onReplyToMessage(msg.chat.id, titlePrompt.message_id, async (titleText) => {
        const title = titleText.text;
        eventHandler.addPartialEvent({ title });

        const locationPrompt = await bot.sendMessage(msg.chat.id, "Location?", {
          reply_markup: {
            force_reply: true,
          },
        });

        bot.onReplyToMessage(msg.chat.id, locationPrompt.message_id, async (locationText) => {
          const location = locationText.text;
          eventHandler.addPartialEvent({ location });

          const crtPrompt = await bot.sendMessage(msg.chat.id, "Court Number?", {
            reply_markup: {
              force_reply: true,
            },
          });
  
          bot.onReplyToMessage(msg.chat.id, crtPrompt.message_id, async (crtText) => {
            const court = crtText.text;
            eventHandler.addPartialEvent({ court });

            const feesPrompt = await bot.sendMessage(msg.chat.id, "Fees?", {
              reply_markup: {
                force_reply: true,
              },
            });
    
            bot.onReplyToMessage(msg.chat.id, feesPrompt.message_id, async (feesText) => {
              const fees = Number(feesText.text);
              eventHandler.addPartialEvent({ fees });
    
              await bot.sendMessage(msg.chat.id, "StartTime?");
              calendar.startNavCalendar(msg);
            });
          });
        });
      });
      break;
    case 'addparticipant':
      break;
    case 'removeparticipant':
      break;
    case 'removeevent':
      if (!eventHandler.events.length) {
        await bot.sendMessage(msg.chat.id, 'No events to remove');
        return;
      }

      const events = eventHandler.events.map(event => ({
        text: event.title,
        callback_data: JSON.stringify({
          title: event.title,
          action: 'removeevent',
        }),
      }));

      await bot.sendMessage(msg.chat.id, "Choose event to remove", {
        reply_markup: {
          inline_keyboard: chunkArray(events),
          one_time_keyboard: true,
        },
      });
      break;
    case 'default':
      break;
    default:
      break;
  }
});

bot.on("callback_query", async (query) => {
  if (query.message.message_id == calendar.chats.get(query.message.chat.id)) {
    const res = calendar.clickButtonCalendar(query);
    if (res !== -1) {
      if (!eventHandler.pendingEvent.startDatetime) {
        eventHandler.addPartialEvent({ startDatetime: getUnixTimestamp(res) });
        await bot.sendMessage(query.message.chat.id, "EndTime?");
        calendar.startNavCalendar(query.message);
        return;
      }

      eventHandler.addPartialEvent({ endDatetime: getUnixTimestamp(res) });
      eventHandler.commitEvent();
      console.log(eventHandler.events);
    }
  }

  if (query.data) {
    try {
      const data = JSON.parse(query.data);
      if (data.action === 'removeevent') {
        eventHandler.removeEvent(data.title);
        await bot.sendMessage(query.message.chat.id, `Event "${data.title}" deleted`);
      }
    } catch (e) {
      console.error(e);
    }
  }
});
