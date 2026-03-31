const userService = require("../services/userService");
const config = require("../config/config");
const axios = require("axios");
const ordersService = require("../services/ordersService");
const telegrammService = require("../services/telegrammService");

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
          await ordersService.confirmOrder(value, 0);

          break;
        }
        case 'WRONG': {
          const order = await ordersService.getOrder(value);
          await telegrammService.sendMessage({
            to: order.userId,
            text: "Что-то не сошлось по сумме. Напишите сообщение, чтобы уточнить детали"
          })
          break;
        }
        case 'DROP': {
          const order = await ordersService.getOrder(value);
          await telegrammService.sendMessage({
            to: order.userId,
            text: "Менеджер не получил вашу оплату. Напишите сообщение, чтобы уточнить детали"
          })
          reply_markup.inline_keyboard = []
          await ordersService.deleteOrder(value)
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
          await ordersService.sendOrders({ userId: message.from.id });
          await telegrammService.sendMessage({
            to: message.chat.id,
            image: config.bot,
            text: "Запустить бота",
            buttons: [
              [
                { text: "Старт", web_app: { url: 'https://fruits-front-eta.vercel.app/admin' } },
              ]
            ]
          })
          
        } catch (error) {
          console.log('Error sending welcome message:', error);
        }
        console.log('end', Date.now() - now)
        return;
      } else {
        const user = message.from;
        const userLink = `<a href="https://t.me/${user.username}">${user.first_name || user.username || 'Пользователь'}</a>`;

        await telegrammService.sendMessage({
            to: config.cashier,
            text: `Сообщение от ${userLink}`,
          })
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
