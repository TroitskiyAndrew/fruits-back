
const dataService = require("../services/mongodb");
const paymentsService = require("../services/paymentsService");


const pay = async (req, res) => {
  try {
    const options = { 
      ...req.body,
      from: req.telegramData?.user?.id 
    };
    const isPayed = await paymentsService.pay(options);
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

