const dataService = require("./mongodb");

async function getTelegramId(userId) {
    const user = await dataService.getDocument('users', userId);
    return user?.telegramId || null
}

function getDate(timestamp) {
    const date = new Date(timestamp);

    return String(date.getDate()).padStart(2, '0') + '.' +
        String(date.getMonth() + 1).padStart(2, '0') + '.' +
        date.getFullYear() + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0') + ':' +
        String(date.getSeconds()).padStart(2, '0');
}

module.exports = {
    getTelegramId: getTelegramId,
    getDate: getDate,
};
