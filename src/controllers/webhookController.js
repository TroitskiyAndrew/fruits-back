const userService = require("../services/userService");
const config = require("../config/config");
const axios = require("axios");

const stateMap = new Map()

const handleWebhook = async (req, res) => {
  try {
    const update = req.body;
    res.sendStatus(200);

    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data;
      const reply_markup = cq.message.reply_markup;
      let text = cq.message.caption || cq.message.text + "\u200B";
      let responseText;
      const [action, value] = data.split('_SPLIT_');
      switch (action) {
        case 'CONFIRM': {
          // const tickets = await dataService.getDocuments('ticket', { bookingId: value });
          // await ticketsService.sendTickets({ bookingId: value });
          
          break;
        }
        case 'MARKETING': {
          // const tickets = await dataService.getDocuments('ticket', { bookingId: value });
          // await ticketsService.sendTickets({ bookingId: value }, { marketing: true });

          break;
        }
        case 'WRONG': {
          // const tickets = await dataService.getDocuments('ticket', { bookingId: value });
          if (tickets.length) {
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
              chat_id: tickets[0].userId,
              text: "Что-то не сошлось по сумме. Напишите сообщение, чтобы уточнить детали",
            });
          }
          break;
        }
        case 'DROP': {
          // const tickets = await dataService.getDocuments('ticket', { bookingId: value });
          await axios.post(`${config.tgApiUrl}/sendMessage`, {
            chat_id: tickets[0].userId,
            text: "Менеджер не получил вашу оплату. Напишите сообщение, чтобы уточнить детали",
          });
          reply_markup.inline_keyboard = []
          // await dataService.deleteDocumentsByQuery('ticket', { bookingId: value });
          break;
        }
        default:
          break;
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
        try {
          await userService.handleUser(message.from, { pressedStart: true });
          // await ticketsService.sendTickets({ userId: message.from.id }, { marketing: true });
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
