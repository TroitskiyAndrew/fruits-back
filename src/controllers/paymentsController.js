
const dataService = require("../services/mongodb");
const paymentsService = require("../services/paymentsService");


const pay = async (req, res) => {
  try {
    const isPayed = await paymentsService.pay(req.body);
    res.status(200).send(isPayed);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(isPayed);
    return;
  }
};




module.exports = {
  pay: pay,
};

