const userService = require("../services/userService");
const configService = require("../services/configService");
const config = require("../config/config");
const axios = require("axios");
const ordersService = require("../services/ordersService");
const paymentsService = require("../services/paymentsService");
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
      const [action, value] = data.split(config.splitParams);
      switch (action) {
        case 'CONFIRM_ORDER': {
          await ordersService.confirmOrder(value);
          await telegrammService.updateMessage(cq.message, { text: `Заказ подтвержден: ${text}`, dropButtons: action });
          break;
        }
        case 'CONFIRM_PAYMENT': {
          await paymentsService.confirmPayment(value, true);
          await telegrammService.updateMessage(cq.message, { text: `Оплата подтверждена: ${text}`, dropButtons: action });
          break;
        }
        case 'DROP_PAYMENT': {
          await paymentsService.confirmPayment(value, false);
          await telegrammService.updateMessage(cq.message, { text: `Оплата не получена: ${text}`, dropButtons: action });
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
        return;
      } else {
        const user = message.from;
        const userLink = `<a href="https://t.me/${user.username}">${user.first_name || user.username || 'Пользователь'}</a>`;

        await telegrammService.sendMessage({
          to: configService.getCashierId(),
          text: `Сообщение от ${userLink}`,
        })
        await axios.post(`${config.tgApiUrl}/forwardMessage`, {
          chat_id: configService.getCashierId(),
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
