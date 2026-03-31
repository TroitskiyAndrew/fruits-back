
const dataService = require("./mongodb");
const userService = require("./userService");
const config = require("../config/config");

let cashierId = config.cashierId;
let referralUrlBase = config.referralUrlBase;

async function getConfig() {
    try {
        const configData = await dataService.getDocumentByQuery('config', { });
        if (configData) {
            cashierId = configData.cashierId || cashierId;
            referralUrlBase = configData.referralUrlBase || referralUrlBase;
        }
    } catch (error) {
        console.log(error)
    }
}

getConfig();

function getCashierId() {
    return cashierId;
}

async function getCashierUser() {
    return userService.getUser({userId: cashierId});
}

function getReferralUrlBase() {
    return referralUrlBase;
}

function getConfig(){
    return {
        cashierId,
        referralUrlBase,
    }
}


module.exports = {
    getCashierId: getCashierId,
    getCashierUser: getCashierUser,
    getReferralUrlBase: getReferralUrlBase,
    getConfig: getConfig
};
