const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const eventsService = require("./eventsService");
const utils = require("./utils");
const axios = require("axios");
const config = require("../config/config");

const citiesMap = new Map();

async function getCities() {
    let cities = [...citiesMap.values()];
    if (!cities.length) {
        cities = await dataService.getDocuments('city', {});
    }
    const events = await eventsService.getEvents();
    const eventsMap = events.reduce((map, event) => {
        const events = map.get(event.city) || [];
        events.push(event);
        map.set(event.city, events);
        return map
    }, new Map());
    cities.forEach(city => city.events = eventsMap.get(city.id));
    const sortedCities = cities.sort((a, b) => a.order - b.order);
    // await axios.post(`${config.tgApiUrl}/sendMessage`, {
    //     chat_id: 1213665880,
    //     text: "Доброе утро, наш сотрудник не смог связаться с вами, так как ваш аккаунт в телеграмме скрыт. ПОжалуйста, напишите @s_gruzdova чтобы купить билеты за наличные",
    // });


    // const users = await dataService.aggregate('user', [
    //     {
    //         $lookup: {
    //             from: "ticket",
    //             let: { userId: "$userId" },
    //             pipeline: [
    //                 {
    //                     $match: {
    //                         $expr: {
    //                             $eq: ["$userId", "$$userId"]
    //                         }
    //                     }
    //                 },
    //                 { $limit: 1 }
    //             ],
    //             as: "tickets"
    //         }
    //     },
    //     {
    //         $match: {
    //             $and: [
    //                 { tickets: { $size: 0 } },   // нет билетов
    //                 {
    //                     $or: [
    //                         { visits: { $size: 0 } },                    // пустой массив
    //                         { visits: "6984917c43c748577e5f8700" }        // содержит значение
    //                     ]
    //                 }
    //             ]
    //         }
    //     }
    // ])
    // const ids = users.map(user => user.userId).filter(id => id !== 140779820);
    // const success = [];
    // const fail = [];
    // for (const id of ids) {
    //     try {
    //         await axios.post(`${config.tgApiUrl}/sendPhoto`, {
    //             chat_id: id,
    //             photo: 'https://www.dropbox.com/scl/fi/pfxe9l923hal1imq5lhq9/what.jpg?rlkey=9vk13epfpfnont2jcjq90z8oi&raw=1',
    //             parse_mode: 'HTML',
    //             caption: 'Я ВСЕ ЕЩЕ ЖДУ ПОКА ТЫ КУПИШЬ БИЛЕТ И МЫ ЗНАТНО ПОУГОРАЕМ\nПочти все места уже расхватали',
    //             reply_markup: {
    //               inline_keyboard: [
    //                 [
    //                   { text: "Нячанг 27.02 Стендап-Концерт", url: 'https://t.me/sverlov_vietnam_2026_bot?startapp=SOURCE_SPLIT_RECALL_SEP_EVENT_SPLIT_6985e0b43677bfc5bc8757bb' },
    //                 ],
    //                 [
    //                   { text: "Нячанг 01.03 Шоу-ипровизация", url: 'https://t.me/sverlov_vietnam_2026_bot?startapp=SOURCE_SPLIT_RECALL_SEP_EVENT_SPLIT_6985e0b43677bfc5bc8757bc' },
    //                 ]
    //               ]
    //             },
    //         });
    //         console.log('sent to ',id )
    //         success.push(id)
            
    //     } catch (error) {
    //         fail.push(id)
    //     }
    // }
    // console.log('success', success.length)
    // console.log('fail', fail.length)
    // await dataService.updateDocuments('event', {}, {$set: {cashiers: [480144364, 655618706, 692369447]}})
    return sortedCities;
}

async function getCitiesToCache() {
    const cities = (await dataService.getDocuments('city', {})) || [];
    for (const city of cities) {
        citiesMap.set(city.id, city)
    }
}

getCitiesToCache()

module.exports = {
    getCities: getCities,
    citiesMap: citiesMap,
};