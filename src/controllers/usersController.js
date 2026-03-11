const dataService = require("../services/mongodb");
const { ObjectId } = require("mongodb");
const userService = require("../services/userService");
const sharesService = require("../services/sharesService");
const roomsService = require("../services/roomsService");
const ticketsService = require("../services/ticketsService");
const axios = require("axios");
const config = require("../config/config");


const getUser = async (req, res) => {
  try {
    const user = await dataService.getDocumentByQuery("user", { userId: Number(req.params.userId) });
    res.status(200).send(user);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const saveSource = async (req, res) => {
  try {
    const { source, sessionId } = req.body;
    const { user } = req.telegramData;
    await userService.handleUser(user, { source, sessionId })
    res.status(200).send(true);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const savePath = async (req, res) => {
  try {
    const { pathPoint, sessionId } = req.body;
    const { user } = req.telegramData;
    await userService.handleUser(user, { pathPoint, sessionId })
    res.status(200).send(true);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const findUsers = async (req, res) => {
  try {
    const users = await userService.findUsers(req.params.query)
    res.status(200).send(users);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

const sendMessage = async (req, res) => {
  try {
    const andrei = 480144364

    const aggregation = [
      {
        $lookup: {
          from: "ticket",
          let: { uid: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$uid"] },
                    { $eq: ["$event", "6985e0b63677bfc5bc8757c5"] }
                  ]
                }
              }
            }
          ],
          as: "tickets"
        }
      },
      {
        $match: {
          "tickets.0": { $exists: true }
        }
      }
    ];

    // const users = await dataService.aggregate('user', aggregation)
    // const ids = users.map(user => user.userId).filter(id => id !== 140779820);
    // console.log('ids', ids.length)
    // const success = [];
    // const fail = [];
    // const link = `<a href="https://www.instagram.com/sverlovsk">@sverlovsk</a>`;
    // for (const id of ids) {
    //   try {
    //     await axios.post(`${config.tgApiUrl}/sendPhoto`, {
    //       chat_id: id,
    //       parse_mode: 'HTML',
    //       photo: 'https://www.dropbox.com/scl/fi/pfxe9l923hal1imq5lhq9/what.jpg?rlkey=9vk13epfpfnont2jcjq90z8oi&raw=1',
    //       caption: `Тут такое дело, сбор гостей на Стендап-Концерт 13 марта передвинулся на 20:00, чтобы всем было удобнее`,
    //       reply_markup: {
    //         inline_keyboard: [
    //           [
    //             { text: "Купить билеты", url: 'https://t.me/sverlov_vietnam_2026_bot?startapp=SOURCE_SPLIT_MUINE-LAST-CALL_SEP_EVENT_SPLIT_6985e0b63677bfc5bc8757c4' },
    //           ]
    //         ]
    //       },
    //     });
    //     console.log('sent to ', id)
    //     success.push(id)

    //   } catch (error) {
    //     console.log(error)
    //     fail.push(id)
    //   }
    // }
    // console.log('success', success.length)
    // console.log('fail', fail.length)

    // await ticketsService.sendTickets({bookingId: 'O-iI0HIL8Um15A'});



    res.status(200).send(true);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

module.exports = {
  getUser: getUser,
  saveSource: saveSource,
  findUsers: findUsers,
  sendMessage: sendMessage,
  savePath: savePath,
};

