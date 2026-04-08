
const dataService = require("../services/mongodb");
const userService = require("../services/userService");
const configService = require("../services/configService");
const { ObjectId } = require('mongodb');
const QRCode = require("qrcode");
const config = require("../config/config");


const getUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const query = Number.isNaN(userId) ? {_id: new ObjectId(req.params.userId)} : { userId };
    const user = await userService.getUser(query);
    res.status(200).send(user);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};
const getUsers = async (req, res) => {
  try {
    const users = await dataService.getDocuments("users", req.body.query || {});
    res.status(200).send(users);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
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
    res.status(200).send(true);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};


const getUserQR = async (req, res) => {
  try {
    const link = `${configService.getReferralUrlBase()}${req.params.id}`;
    const buffer = await QRCode.toBuffer(link, {
      type: 'png',
      width: 512,
      margin: 2,
    });
    res.type("png");
    res.send(buffer);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(null);
    return;
  }
};

const updateUser = async (req, res) => {
  try {
    const { id, paymentMethods, currency } = req.body;
    if(!id) {
      throw new Error('User id is required');
    }
    let success = false
    if(paymentMethods) {
      success = await userService.updatePaymentMethods(id, paymentMethods);
    } else if(currency) {
      success = await userService.changeCurrency(id, currency);      
    }
    res.status(200).send(success);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};




module.exports = {
  getUser: getUser,
  getUsers: getUsers,
  saveSource: saveSource,
  findUsers: findUsers,
  sendMessage: sendMessage,
  savePath: savePath,
  getUserQR: getUserQR,
  updateUser: updateUser,
};

