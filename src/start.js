const express = require("express");
const multer = require("multer");
const http = require("http");
const cors = require("cors");
const  { parse, isValid } = require("@telegram-apps/init-data-node");

const upload = multer({ dest: 'uploads/' });

const config = require("./config/config");
const usersController = require("./controllers/usersController");
const eventsController = require("./controllers/eventsController");
const userService = require("./services/userService");
const ticketsController = require("./controllers/ticketsController");
const placeController = require("./controllers/placeController");
const webhookController = require("./controllers/webhookController");
const socketService = require("./services/socketService");
const citiesService = require("./services/citiesService");
const cityController = require("./controllers/cityController");

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24 часа

const app = express();
const server = http.createServer(app);

socketService.initSocket(server)

const telegramInitDataMiddleware = async (req, res, next) => {
  try {

    // // ToDo для локального тестирования
    //   req.telegramData = { user: { id: 111, first_name: 'Тестовый юзер' }, chat: null, params: {} }
    //   next();
    //   return;
    if (!config.prod) {
      // ToDo для локального тестирования
      req.telegramData = { user: { id: 111, first_name: 'Тестовый юзер' }, chat: null, params: {} }
      await userService.handleUser(null, {sessionId: req.body.sessionId})
      next();
      return;
    }

    // 1) Получаем СЫРУЮ строку initData (как есть, без перекодирования!)
    const raw = (req.get(config.telegrammHeader) || req.body?.initData || '').toString();
    if (!raw) {
      req.telegramData = {}
      await userService.handleUser(null, {sessionId: req.body.sessionId})
      next();
    } else {
      const isInitDataValid = isValid(
        raw,
        config.botToken,
      );
      if(!isInitDataValid){
        return res.status(401).json({ error: 'initData invalid' });
      }
      const telegramData = parse(raw);
      telegramData.params = (telegramData.start_param || '').split(config.splitParams).reduce((result, param) => {
        const [key, value] = param.split('=');
        result[key] = value;
        return result;
      } , {}) 
      req.telegramData = telegramData;
      await userService.handleUser(telegramData.user, {sessionId: req.body.sessionId})
      next();
    }

  } catch (e) {
    console.log(e)
    return res.status(400).json({ error: 'initData processing error', details: e?.message });
  }
};


app.use(express.json());
app.use(cors({ origin: config.frontURL, credentials: true }));
app.use(telegramInitDataMiddleware);
app.post("/webhook", webhookController.handleWebhook);



app.get("/users/:userId", usersController.getUser);
app.post("/users", usersController.saveSource);
app.post("/path", usersController.savePath);

app.post("/message", usersController.sendMessage);
// app.post("/users", usersController.createUser);
// app.put("/users", usersController.updateUser);

// app.get("/members/:roomId", membersController.getMembers);
// app.post("/members", membersController.createMember);
// app.put("/members", membersController.updateMember);
// app.put("/role", membersController.changeRole);

// app.get("/payments/:roomId", paymentsController.getPayments);
// app.post("/payments", paymentsController.createPayment);
// app.put("/payments", paymentsController.updatePayment);
// app.delete("/payments/:paymentId", paymentsController.deletePayment);

// app.get("/rooms", roomsController.getRooms);
// app.post("/rooms", roomsController.createRoom);
// app.put("/rooms", roomsController.updateRoom);
// app.get("/state/:roomId", roomsController.getRoomState);

// app.get("/shares/:paymentId", sharesController.getShares);
// app.put("/shares", sharesController.updateShare);
// app.delete("/shares/:shareId", sharesController.deleteShare);





server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
