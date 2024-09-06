import * as dotenv from 'dotenv';
dotenv.config();

// import { DynamoDB } from '@aws-sdk/client-dynamodb';
import TelegramBot from 'node-telegram-bot-api';
import Calendar from 'telegram-inline-calendar';
import { EventHandler } from './eventHandler';
import { getUnixTimestamp } from './datetime';
import { preparePrompt } from './utils';

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

const eventHandler = new EventHandler();

bot.setMyCommands(
  [
    {
      command: '/changeevents',
      description: 'Change Events',
    },
    {
      command: '/displayevents',
      description: 'Display Events',
    },
    {
      command: '/addevent',
      description: 'Add new event',
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
    case 'changeevents':
      const chunkedEvents = eventHandler.getChunkedEvents(command);
      if (!chunkedEvents.length) {
        await bot.sendMessage(msg.chat.id, "no events to show");
        break;
      }
      await bot.sendMessage(msg.chat.id, "Choose event", {
        reply_markup: {
          inline_keyboard: eventHandler.getChunkedEvents(command),
          remove_keyboard: true,
          one_time_keyboard: true,
        },
      });
      break;
    case 'displayevents':
      await bot.sendMessage(msg.chat.id, eventHandler.displayEvents());
      break;
    case 'addevent':
      const titlePrompt = await bot.sendMessage(msg.chat.id, "Title?", {
        reply_markup: {
          force_reply: true,
        },
      });
      bot.onReplyToMessage(msg.chat.id, titlePrompt.message_id, async (titleText) => {
        const title = titleText.text;
        eventHandler.addEvent(title);
        await bot.sendMessage(msg.chat.id, eventHandler.displayEvents());
      });
      break;
    case 'default':
      break;
    default:
      break;
  }
});

bot.on("callback_query", async (query: TelegramBot.CallbackQuery) => {
  if (query.message.message_id == calendar.chats.get(query.message.chat.id)) {
    const res = calendar.clickButtonCalendar(query);
    if (res !== -1 && eventHandler.currentPointer >= 0) {
      eventHandler.updateEvent({ startDatetime: getUnixTimestamp(res) });
      await bot.sendMessage(query.message.chat.id, eventHandler.displayEvents());
    }
    return;
  }

  if (query.data) {
    try {
      const data = JSON.parse(query.data);

      if (data.t) {
        eventHandler.updatePointer(data.t);
      }

      switch (data.act) {
        case 'changeevents':
          await bot.editMessageText(eventHandler.displayEvent(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
            reply_markup: {
              inline_keyboard: eventHandler.getChunkedInstructions(),
            },
          });
          break;
        case 'editevent':
          await bot.editMessageReplyMarkup({
            inline_keyboard: eventHandler.getChunkedFields(),
          }, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'editeventfield':
          if (data.f === 'startDatetime') {
            calendar.startNavCalendar(query.message);
          } else if (data.f === 'hours') {
            await bot.editMessageReplyMarkup({
              inline_keyboard: eventHandler.getChunkedHours(),
            }, {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              inline_message_id: query.inline_message_id,
            });
          } else if (data.f === 'addcourt') {
            await bot.editMessageReplyMarkup({
              inline_keyboard: eventHandler.getChunkedCourts(),
            }, {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              inline_message_id: query.inline_message_id,
            });
          } else if (data.f === 'removecourt') {
            await bot.editMessageReplyMarkup({
              inline_keyboard: eventHandler.getChunkedCurrentCourts(),
            }, {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id,
              inline_message_id: query.inline_message_id,
            });
          } else {
            const updatePrompt = await bot.sendMessage(query.message.chat.id, `new ${data.f}`, {
              reply_markup: {
                force_reply: true,
              },
            });
    
            bot.onReplyToMessage(query.message.chat.id, updatePrompt.message_id, async (text) => {
              const newField = text.text;
              eventHandler.updateEvent({ [data.f]: newField });

              await bot.sendMessage(updatePrompt.chat.id, eventHandler.displayEvents());
              // await bot.deleteMessage(query.message.chat.id, String(updatePrompt.message_id));
              // await bot.deleteMessage(query.message.chat.id, String(text.message_id));
              // await bot.editMessageText(eventHandler.displayEvents(), {
              //   chat_id: query.message.chat.id,
              //   message_id: query.message.message_id,
              //   inline_message_id: query.inline_message_id,
              // });
            });
          }
          break;
        case 'editeventhours':
          eventHandler.updateEvent({ hours: Number(data.h) });
          await bot.editMessageText(eventHandler.displayEvents(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'addeventcourts':
          const currentCourtsAdd = eventHandler.events[eventHandler.currentPointer].court;
          eventHandler.updateEvent({ court: [...currentCourtsAdd, Number(data.c)] });
          await bot.editMessageText(eventHandler.displayEvents(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'removeeventcourts':
          const currentCourtsDel = eventHandler.events[eventHandler.currentPointer].court;
          eventHandler.updateEvent({ court: currentCourtsDel.filter(c => c !== Number(data.c)) });
          await bot.editMessageText(eventHandler.displayEvents(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'removeevent':
          eventHandler.removeEvent();
          await bot.editMessageText(eventHandler.displayEvents(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'addparticipant':
          const addNamePrompt = await bot.sendMessage(query.message.chat.id, "Name?", {
            reply_markup: {
              force_reply: true,
            },
          });
  
          bot.onReplyToMessage(query.message.chat.id, addNamePrompt.message_id, async (nameText) => {
            eventHandler.addParticipant(nameText.text);
            await bot.sendMessage(addNamePrompt.chat.id, eventHandler.displayEvents());
            // await bot.deleteMessage(query.message.chat.id, String(addNamePrompt.message_id));
            // await bot.deleteMessage(query.message.chat.id, String(nameText.message_id));
            // await bot.editMessageText(eventHandler.displayEvents(), {
            //   chat_id: query.message.chat.id,
            //   message_id: query.message.message_id,
            //   inline_message_id: query.inline_message_id,
            // });
          });
          break;
        case 'removeparticipant':
          await bot.editMessageReplyMarkup({
            inline_keyboard: eventHandler.getChunkedParticipants(),
          }, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        case 'removeselectedparticipant':
          eventHandler.removeParticipant(data.p);
          await bot.editMessageText(eventHandler.displayEvents(), {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            inline_message_id: query.inline_message_id,
          });
          break;
        default:
          //
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }
});
