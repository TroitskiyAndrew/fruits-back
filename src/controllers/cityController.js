const dataService = require("../services/mongodb");
const cityService = require("../services/citiesService.js");

const getCities = async (req, res) => {
  try {
    const cities = await cityService.getCities();
    res.status(200).send(cities);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const saveVisitToCity = async (req, res) => {
  try {
    const {city} = req.body;
    const { user } = req.telegramData;
    await cityService.saveVisit(user, {city})
    res.status(200).send(true);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};



module.exports = {
  getCities: getCities,
  saveVisitToCity: saveVisitToCity,
};
