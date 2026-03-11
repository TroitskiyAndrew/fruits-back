const eventsService = require("../services/eventsService");
const cityService = require("../services/citiesService");

const getEvent = async (req, res) => {
  try {
    const event = await eventsService.getEvent(req.params.eventId);
    res.status(200).send(event);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};



module.exports = {
  getEvent: getEvent,
};
