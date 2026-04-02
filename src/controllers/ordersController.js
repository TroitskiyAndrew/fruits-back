
const dataService = require("../services/mongodb");
const ordersService = require("../services/ordersService");
const configService = require("../services/configService");
const QRCode = require("qrcode");
const FormData = require("form-data");
const config = require("../config/config");


const getOrder = async (req, res) => {
  try {
    const order = await dataService.getDocument("orders", req.params.orderId);
    res.status(200).send(order);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};
const getOrders = async (req, res) => {
  try {
    const dbUser = await dataService.getDocumentByQuery('users', {userId: req.telegramData.user.id})
    const query = req.body.query;
    if(!dbUser.admin &&  req.telegramData.user.id !== configService.getCashierId()) {
      query.userId = req.telegramData.user.id
    } 
    const orders = await dataService.getDocuments("orders", query);
    res.status(200).send(orders);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

const createOrder = async (req, res) => {
  try {
    const {order, payment} = await ordersService.createOrder(req.body.order, req.body.method);
    res.status(200).send({order, payment});
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(null);
    return;
  }
};
const updateOrder = async (req, res) => {
  try {
    await ordersService.updateOrder(req.body.order);
    res.status(200).send(orders);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send([]);
    return;
  }
};

const deleteOrder = async (req, res) => {
  try {
    const result = await ordersService.deleteOrder(req.params.orderId);
    res.status(200).send(result);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(false);
    return;
  }
};



module.exports = {
  getOrder: getOrder,
  getOrders: getOrders,
  createOrder: createOrder,
  updateOrder: updateOrder,
  deleteOrder: deleteOrder,
};

