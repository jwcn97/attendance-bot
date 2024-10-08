import * as dotenv from 'dotenv';
dotenv.config();

import TelegramBot from 'node-telegram-bot-api';
import Calendar from 'telegram-inline-calendar';
import { EventHandler } from './eventHandler';
import { WHITELIST_ADMIN, DATETIME_FORMAT } from './constants';
import { getUnixTimestamp } from './utils/datetime';
import { getFullDay } from './utils/display';
import { preparePrompt } from './utils';

import type { Message } from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const calendar = new Calendar(bot, {
  date_format: DATETIME_FORMAT,
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
      command: '/displayevents',
      description: 'Display Events',
    },
    {
      command: '/changeevents',
      description: 'Change Events',
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
  const isAdmin = msg.chat.type == 'private';
  // && WHITELIST_ADMIN.includes(msg.from.username);

  const { command, prompt } = preparePrompt(msg);
  if (!command) return;
  console.log('\nCOMMAND:', command, '\nPROMPT:', prompt);

  switch (command) {
    case 'changeevents':
      const chunkedEvents = eventHandler.getEvents();
      if (!chunkedEvents.length) {
        await bot.sendMessage(msg.chat.id, "no events to show");
        break;
      }
      await bot.sendMessage(msg.chat.id, "Choose event", {
        reply_markup: {
          inline_keyboard: chunkedEvents,
          remove_keyboard: true,
          one_time_keyboard: true,
        },
      });
      break;
    case 'displayevents':
      await bot.sendMessage(msg.chat.id, eventHandler.displayEvents());
      break;
    case 'addevent':
      if (!isAdmin) {
        break;
      }
      eventHandler.currentPointer = -1;
      calendar.startNavCalendar(msg);
      break;
    case 'default':
      break;
    default:
      break;
  }
});

bot.on("callback_query", async (query: TelegramBot.CallbackQuery) => {
  const isAdmin = query.message.chat.type == 'private';
  // && WHITELIST_ADMIN.includes(query.from.username);

  if (query.message.message_id == calendar.chats.get(query.message.chat.id)) {
    const res = calendar.clickButtonCalendar(query);
    if (res === -1) {
      return;
    }

    const startDatetime = getUnixTimestamp(res);
    eventHandler.addEvent({ title: `HBK ${getFullDay(startDatetime)} badminton`, startDatetime });
    await bot.sendMessage(query.message.chat.id, eventHandler.displayEvent(), {
      reply_markup: {
        inline_keyboard: eventHandler.getChunkedFields(),
      },
    });
    return;
  }

  if (!query.data) {
    return;
  }

  try {
    const data = JSON.parse(query.data);

    if (data.t) {
      eventHandler.updatePointer(Number(data.t));
    }

    const editMsgOption = {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      inline_message_id: query.inline_message_id,
    };

    const msgReplyOption = {
      reply_markup: {
        inline_keyboard: eventHandler.getChunkedInstructions(isAdmin),
      },
    }

    const editMsgOptionWithInstruction = {
      ...editMsgOption,
      ...msgReplyOption,
    }

    const currentEvent = eventHandler.events[eventHandler.currentPointer];

    switch (data.act) {
      case 'vieweventlist':
        // NOTE: case for when admin returns from choose event
        await bot.editMessageText("Choose event", {
          ...editMsgOption,
          reply_markup: {
            inline_keyboard: eventHandler.getEvents(),
          },
        });
        break;
      case 'changeevents':
        await bot.editMessageText(eventHandler.displayEvent(), editMsgOptionWithInstruction);
        break;
      case 'editevent':
        await bot.editMessageReplyMarkup({
          inline_keyboard: eventHandler.getChunkedFields(),
        }, editMsgOption);
        break;
      case 'editeventfield':
        if (data.f === 'hours') {
          await bot.editMessageReplyMarkup({
            inline_keyboard: eventHandler.getChunkedHours(),
          }, editMsgOption);
        } else if (data.f === 'addcourt') {
          await bot.editMessageReplyMarkup({
            inline_keyboard: eventHandler.getChunkedCourts(),
          }, editMsgOption);
        } else {
          const updatePrompt = await bot.sendMessage(query.message.chat.id, `new ${data.f}`, {
            reply_markup: {
              force_reply: true,
            },
          });
  
          bot.onReplyToMessage(query.message.chat.id, updatePrompt.message_id, async (text) => {
            const newField = text.text;
            eventHandler.updateEvent({ [data.f]: newField });

            await bot.sendMessage(updatePrompt.chat.id, eventHandler.displayEvent(), msgReplyOption);
            // await bot.deleteMessage(query.message.chat.id, String(updatePrompt.message_id));
            // await bot.deleteMessage(query.message.chat.id, String(text.message_id));
            // await bot.editMessageText(eventHandler.displayEvent(), editMsgOption);
          });
        }
        break;
      case 'editeventhours':
        eventHandler.updateEvent({ hours: Number(data.h) });
        await bot.editMessageText(eventHandler.displayEvent(), editMsgOptionWithInstruction);
        break;
      case 'addeventcourts':
        eventHandler.updateEvent({ court: [...currentEvent.court, Number(data.c)] });
        await bot.editMessageText(eventHandler.displayEvent(), {
          ...editMsgOption,
          reply_markup: {
            // NOTE: need to refetch instructions in case court number hits boundary
            inline_keyboard: eventHandler.getChunkedInstructions(isAdmin),
          },
        });
        break;
      case 'removeevent':
        eventHandler.removeEvent();
        const chunkedEvents = eventHandler.getEvents();
        if (!chunkedEvents.length) {
          await bot.editMessageText("no events to show", editMsgOption);
          break;
        }
        await bot.editMessageText("Choose event", {
          ...editMsgOption,
          reply_markup: {
            inline_keyboard: eventHandler.getEvents(),
          },
        });
        break;
      case 'addparticipant':
        const addNamePrompt = await bot.sendMessage(query.message.chat.id, "Name?", {
          reply_markup: {
            force_reply: true,
          },
        });

        bot.onReplyToMessage(query.message.chat.id, addNamePrompt.message_id, async (nameText) => {
          eventHandler.addParticipants(nameText.text.split(','));
          await bot.sendMessage(addNamePrompt.chat.id, eventHandler.displayEvent(), {
            reply_markup: {
              // NOTE: need to run this to include remove participant instruction
              // (case when participant number goes from 0 -> 1)
              inline_keyboard: eventHandler.getChunkedInstructions(isAdmin),
            },
          });
          // await bot.deleteMessage(query.message.chat.id, String(addNamePrompt.message_id));
          // await bot.deleteMessage(query.message.chat.id, String(nameText.message_id));
          // await bot.editMessageText(eventHandler.displayEvent(), editMsgOption);
        });
        break;
      case 'removeparticipant':
        await bot.editMessageReplyMarkup({
          inline_keyboard: eventHandler.getChunkedParticipants(),
        }, editMsgOption);
        break;
      case 'removeselectedparticipant':
        eventHandler.removeParticipant(data.p);
        await bot.editMessageText(eventHandler.displayEvent(), {
          ...editMsgOption,
          reply_markup: {
            // NOTE: need to refetch instructions in case participant number hits 0
            inline_keyboard: eventHandler.getChunkedInstructions(isAdmin),
          },
        });
        break;
      default:
        //
        break;
    }
  } catch (e) {
    console.error(e);
  }
});
