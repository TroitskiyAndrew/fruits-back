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
    cashierId: process.env.CASHIER_ID ? Number(process.env.CASHIER_ID) : 480144364,
    referralUrlBase: process.env.REFERRAL_URL_BASE || 'https://fruits-front-eta.vercel.app/',      
    bot: process.env.BOT_IMAGE || 'https://www.dropbox.com/scl/fi/1ixbnlndtmgljg2ghlmv2/bot.jpg?rlkey=unojp6z9bkq96sajnkv71kh53&dl=1',
    salesNotifications: process.env.SALES_NOTIFICATION ? JSON.parse(process.env.SALES_NOTIFICATION) : [480144364],
}