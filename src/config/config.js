const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    splitParams: '_SPLIT_',
    port: process.env.PORT,
    mongodbConnectionString: process.env.MONGODB_CONNECTION_STRING || '',
    mongodbDatabase: process.env.MONGODB_DATABASE_NAME || '',
    frontURL: process.env.FRONT_URL || "*",
    botToken: process.env.BOT_TOKEN  || "",
    telegrammHeader: process.env.TELEGRAMM_HEADER  || "",
    prod: process.env.LOCAL_DEVELOPMENT  == null,
    tgApiUrl:`https://api.telegram.org/bot${process.env.BOT_TOKEN}`,
    admins: process.env.ADMINS ? process.env.ADMINS.split(',') : [],
    ticketTypes: process.env.TICKET_TYPES ? JSON.parse(process.env.TICKET_TYPES) : {},
    cashier: process.env.CASHIER ? Number(process.env.CASHIER) : 480144364,
    ticketUrlBase: (process.env.TICKET_URL_BASE || 'https://t.me/sverlov_vietnam_2026_bot') + '?startapp=TICKET_SPLIT_',
    vndQR: process.env.VND_QR || 'https://www.dropbox.com/scl/fi/5mnlymj9q1sbl69ydyqth/vndQR.jpg?rlkey=lo095u7dl181eq7lxgah6x868&dl=0',
    rubQR: process.env.RUB_QR || 'https://www.dropbox.com/scl/fi/h9q90ybkyi8te4a4dj6a4/rubQR.jpg?rlkey=hb1kax5319wa2qkdznprxwqbx&dl=0',
    rubAccount: process.env.RUB_ACCOUNT || 'по номеру 89126697190 на АльфаБанк',
    mainImage: process.env.MAIN_IMAGE || 'https://www.dropbox.com/scl/fi/effyav2xjnlc8rvdg5x56/main.jpeg?rlkey=073r242acvcathoutqiqipwyu&raw=1',
    wait: process.env.WAIT || 'https://www.dropbox.com/scl/fi/gll6m7uuzwi37cb6379bl/zhdun.jpg?rlkey=xmm48wmk0ri4ckudm5bde23ez&dl=0',
    bot: process.env.BOT_IMAGE || 'https://www.dropbox.com/scl/fi/gpdjt5pi1vu795r9rikbg/bot.png?rlkey=idgmc8f1sppya03mz1dllzyfw&raw=1',
    eventTypes: process.env.EVENT_TYPES ? JSON.parse(process.env.EVENT_TYPES) : ['Стендап Концерт', 'Стендап Импровизация'],
    salesNotifications: process.env.SALES_NOTIFICATION ? JSON.parse(process.env.SALES_NOTIFICATION) : [655618706, 480144364, 140779820],
}