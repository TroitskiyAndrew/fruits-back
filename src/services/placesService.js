const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");

const placesCache = [];

async function getPlaces() {
    if(placesCache.length){
        return placesCache;
    }
    const places = await dataService.getDocuments('place', {});
    placesCache.push(...places)
    return places;
}



module.exports = {
    getPlaces: getPlaces,
};