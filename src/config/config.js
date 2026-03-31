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
    cashier: process.env.CASHIER ? Number(process.env.CASHIER) : 480144364,
    qrUrlBase: process.env.QR_URL_BASE || 'https://fruits-bot/',    
    ticketUrlBase: (process.env.TICKET_URL_BASE || 'https://t.me/sverlov_vietnam_2026_bot') + '?startapp=TICKET_SPLIT_',    
    bot: process.env.BOT_IMAGE || 'https://www.dropbox.com/scl/fi/1ixbnlndtmgljg2ghlmv2/bot.jpg?rlkey=unojp6z9bkq96sajnkv71kh53&dl=1',
    salesNotifications: process.env.SALES_NOTIFICATION ? JSON.parse(process.env.SALES_NOTIFICATION) : [480144364],
}