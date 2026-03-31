
const dataService = require("../services/mongodb");
const configService = require("../services/configService");



const getConfig = async (req, res) => {
  try {
    const config = configService.getConfig();
    res.status(200).send(config);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(null);
    return;
  }
};


module.exports = {
  getConfig: getConfig
};

