const dataService = require("../services/mongodb");
const citiesService = require("../services/citiesService");
const eventsService = require("../services/eventsService");
const userService = require("../services/userService");
const ticketsService = require("../services/ticketsService");
const QRCode = require("qrcode");
const crypto = require("crypto");
const config = require("../config/config");
const axios = require("axios");
const FormData = require("form-data");
const { ObjectId } = require("mongodb");
const { sendMessage } = require("../services/messageService");

const stateMap = new Map()

const handleWebhook = async (req, res) => {
  try {
    const update = req.body;
    res.sendStatus(200);
    let isAdmin = false;
    // if (update._sendMessage) {
    //   res.json({ ok: true });
    //   console.log(req.body)
    //   sendMessage(req.body.chat_id, req.body.text, req.body.reply_markup)
    //   return;
    // }

    if (update.callback_query) {
      let emptyButton = false;
      const cq = update.callback_query;
      const data = cq.data;
      const chat_id = cq.message.chat.id;
      const reply_markup = cq.message.reply_markup;
      const userId = cq.from.id.toString()
      isAdmin = config.admins.includes(userId)
      let text = cq.message.caption || cq.message.text + "\u200B";
      let newPhoto;
      let responseText;
      if (data === 'getCities') {
        const cities = await citiesService.getCities();
        reply_markup.inline_keyboard = cities.map(city => [
          { text: `${city.name} (${city.events.map(event => event.date).join(', ')})`, callback_data: `CITY_${city.id}` },
        ])
        reply_markup.inline_keyboard.push([
          { text: "Назад", callback_data: `HOME` },
        ])
        text = "Выберите город";
      } else {
        const [action, value, context] = data.split('_SPLIT_');
        switch (action) {
          case 'CONFIRM': {
            const tickets = await dataService.getDocuments('ticket', { bookingId: value });
            if (!tickets.length) {
              console.log('___No tickets___', action, value)
              return;
            }
            await dataService.updateDocuments("ticket", { bookingId: value }, { $set: { confirmed: true } });
            reply_markup.inline_keyboard = []
            text = 'Подтверждено: ' + text;
            await ticketsService.sendTickets({ bookingId: value });
            const total = tickets.reduce((acc, ticket) => acc += ticket.price, 0);
            const ticketStrings = []
            for (const ticket of tickets) {
              const event = await eventsService.getEventFromCache(ticket.event);
              ticketStrings.push(`${citiesService.citiesMap.get(event.city).name} ${event.date} ${config.eventTypes[event.type]} - ${config.ticketTypes[ticket.type]}`)
            };
            const dbUser = (await dataService.getDocumentByQuery('user', { userId: tickets[0].userId })) || {};
            const source = dbUser?.source || '';
            const sources = dbUser?.sources || [];
            const notifySources = [...new Set([source, sources[sources.length - 1]].filter(Boolean))].join('/')
            const { user } = dbUser;
            const userLink = `<a href="https://t.me/${user.username}">${user.first_name || user.username || 'Пользователь'}</a>`;
            const info = `${userLink} купил:\n${ticketStrings.join(',\n')}.\nНа общую сумму ${total}${tickets[0].currency === 'VND' ? '.000 VND' : tickets[0].currency === 'RUB' ? ' руб' : ' USDT'}${notifySources ? '\n От ' + notifySources : ''}`
            text = `Подтверждена оплата от ${userLink} за:\n${ticketStrings.join(',\n')}.\nНа общую сумму ${total}${tickets[0].currency === 'VND' ? '.000 VND' : tickets[0].currency === 'RUB' ? ' руб' : ' USDT'}${notifySources ? '\n От ' + notifySources : ''}`
            for (const notify of config.salesNotifications) {
              await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: notify,
                parse_mode: 'HTML',
                text: info,
              });
            }
            break;
          }
          case 'MARKETING': {
            const tickets = await dataService.getDocuments('ticket', { bookingId: value });
            await dataService.updateDocuments("ticket", { bookingId: value }, { $set: { type: 0, price: 0, confirmed: true } });
            if (!tickets.length) {
              console.log('___No tickets___', action, value)
              return;
            }
            reply_markup.inline_keyboard = []
            text = tickets.length > 1 ? 'Подтверждены бесплатные билеты: ' : 'Подтвержден бесплатный билет: ' + text;
            await ticketsService.sendTickets({ bookingId: value }, { marketing: true });

            break;
          }
          case 'WRONG': {
            const tickets = await dataService.getDocuments('ticket', { bookingId: value });
            if (tickets.length) {
              await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: tickets[0].userId,
                text: "Что-то не сошлось по сумме. Напишите сообщение, чтобы уточнить детали",
              });
            }
            break;
          }
          case 'DROP': {
            const tickets = await dataService.getDocuments('ticket', { bookingId: value });
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
              chat_id: tickets[0].userId,
              text: "Менеджер не получил вашу оплату. Напишите сообщение, чтобы уточнить детали",
            });
            reply_markup.inline_keyboard = []
            await dataService.deleteDocumentsByQuery('ticket', { bookingId: value });
            break;
          }
          default:
            emptyButton = true;
            break;
        }
      }
      if (!emptyButton) {
        if (newPhoto) {
          await axios.post(`${config.tgApiUrl}/editMessageMedia`, {
            chat_id,
            message_id: cq.message.message_id,
            media: {
              type: 'photo',
              media: newPhoto,
              caption: text,
              parse_mode: 'HTML'
            },
            reply_markup,
          });

        } else {
          const msg = cq.message;
          const hasPhoto = Array.isArray(msg.photo) && msg.photo.length > 0;
          if (hasPhoto) {
            await axios.post(`${config.tgApiUrl}/editMessageCaption`, {
              chat_id,
              message_id: cq.message.message_id,
              caption: text,
              parse_mode: 'HTML',
              reply_markup,
            });

          } else {
            await axios.post(`${config.tgApiUrl}/editMessageText`, {
              chat_id,
              message_id: cq.message.message_id,
              text,
              parse_mode: 'HTML',
              reply_markup,
            });
          }
        }
      }

      await axios.post(`${config.tgApiUrl}/answerCallbackQuery`, {
        callback_query_id: cq.id,
        text: responseText
      });


    }
    const message = update.message;
    if (message) {
      if (message.text === "/start") {
        const now = Date.now();
        console.log('start', now)
        try {
          console.log('startMessage', 'sessionId', 'null')
          await userService.handleUser(message.from, { pressedStart: true });
          await ticketsService.sendTickets({ userId: message.from.id }, { marketing: true });
          await axios.post(`${config.tgApiUrl}/sendPhoto`, {
            chat_id: message.chat.id,
            photo: config.bot,
            caption: 'Жми на старт👇и хватай билеты на легендарные шоу любимого комика',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "Старт", web_app: { url: 'https://sverlov-vietnam-2026.com' } },
                ]
              ]
            },
          }, { timeout: 5000 });
        } catch (error) {
          console.log('Error sending welcome message:', error);
        }
        console.log('end', Date.now() - now)
        return;
      } else {
        const user = message.from;
        const userLink = `<a href="https://t.me/${user.username}">${user.first_name || user.username || 'Пользователь'}</a>`;
        await axios.post(`${config.tgApiUrl}/sendMessage`, {
          chat_id: config.cashier,
          parse_mode: 'HTML',
          text: `Сообщение от ${userLink}`,
        });
        await axios.post(`${config.tgApiUrl}/forwardMessage`, {
          chat_id: config.cashier,
          from_chat_id: message.chat.id,
          message_id: message.message_id
        });

      }
    }


    // res.json({ ok: true });
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

module.exports = {
  handleWebhook: handleWebhook,
};
