const placeService = require("../services/placesService.js");

const getPlaces = async (req, res) => {
  try {
    const places = await placeService.getPlaces();
    res.status(200).send(places);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};



module.exports = {
  getPlaces: getPlaces,
};
