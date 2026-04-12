
const dataService = require("./mongodb");
const QRCode = require("qrcode");
const FormData = require("form-data");
const config = require("../config/config");
const { ObjectId } = require('mongodb');

async function handleUser(user, options) {
    try {
        let { city, pressedStart, source, sessionId, event, pathPoint } = options;
        source = source === 'tour' ? '@sverlovsk' : source;
        let dbUser;
        let save = false;
        if (user) {
            const userId = user.id;
            dbUser = await dataService.getDocumentByQuery('users', { userId });
            if (!dbUser) {
                if (!sessionId) {
                    return;
                }
                dbUser = await dataService.createDocument('users', { user, paymentMethods: { rub: {bank: null, cash: false}, vnd: {bank: null, cash: false}, usdt: {bank: null, cash: false} }, sources: [], userId, pressedStart: false, visits: [], path: [], source: source || '', sessionId })
            }
            if (sessionId) {
                const userBySession = await dataService.getDocumentByQuery('users', { sessionId, userId: 0 });
                if (userBySession?.sessionId) {
                    save = true;
                    dbUser.source = userBySession.source || dbUser.source;
                    dbUser.sessionId = sessionId;
                    dbUser.path = [...dbUser.path, ...userBySession.path];
                    await dataService.deleteDocumentsByQuery('users', { sessionId, userId: 0 });
                }
            }
        } else if (sessionId) {
            dbUser = await dataService.getDocumentByQuery('users', { sessionId, userId: 0 });
            if (!dbUser) {
                dbUser = await dataService.createDocument('users', { user: {}, paymentMethods: { rub: {bank: null, cash: false}, vnd: {bank: null, cash: false}, usdt: {bank: null, cash: false} }, sources: [], userId: 0, pressedStart: false, visits: [], path: [], source: source || '', sessionId })
            }
        }
        if (source) {
            save = true;
            const lastPoint = dbUser.path[dbUser.path.length - 1];
            if (source !== lastPoint) {
                dbUser.path.push(source);
            }
            const lastSource = dbUser.sources[dbUser.sources.length - 1];
            if (source !== lastSource) {
                dbUser.sources.push(source);
            }
            if (!dbUser.source) {
                dbUser.source = source
            }
            if (!dbUser.referral && Number(source)) {
                dbUser.referral = Number(source);
            }
        }
        if (pathPoint) {
            save = true;
            const lastPoint = dbUser.path[dbUser.path.length - 1];
            if (pathPoint !== lastPoint) {
                dbUser.path.push(pathPoint);
            }
        }
        if (city && !dbUser.visits.includes(city)) {
            save = true;
            dbUser.visits.push(city)
        }
        if (event) {
            const lastPoint = dbUser.path[dbUser.path.length - 1];
            save = true;
            if (event !== lastPoint) {
                dbUser.path.push(event);
            }
        }
        if (pressedStart && !dbUser.pressedStart) {
            save = true;
            dbUser.pressedStart = true;
        }
        if (save) {
            await dataService.updateDocument('users', dbUser);
        }
    } catch (error) {
        console.log(error)
    }
}

async function findUsers(query = '') {
    const users = await dataService.getDocuments('users', {
        $or: [
            { "user.first_name": { $regex: query, $options: "i" } },
            { "user.last_name": { $regex: query, $options: "i" } },
            { "user.username": { $regex: query, $options: "i" } }
        ]
    });

    return (users || []).map(user => {
        const hasName = user.user.first_name || user.user.last_name;
        let name = hasName ? [user.user.first_name, user.user.last_name].filter(Boolean).join(' ') : '';
        if (user.user.username) {
            name += name ? '(' + user.user.username + ')' : user.user.username;
        }
        return {
            name,
            userId: user.userId
        }
    });
}

async function makeReferral(userId) {
    try {
        await dataService.updateDocumentByQuery('users', { userId }, { $set: { referral: true } });
        return true
    } catch (error) {
        return false;
    }
}

async function getUser(query) {
    try {
        const user = await dataService.getDocumentByQuery('users', query);
        return user;
    } catch (error) {
        return null;
    }
}

async function updatePaymentMethods(id, paymentMethods) {
    try {
        const _id = new ObjectId(id);
        await dataService.updateDocumentByQuery('users', { _id }, { $set: { paymentMethods } });
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}

async function changeCurrency(id, currency) {
    try {
        const _id = new ObjectId(id);
        const result = await dataService.updateDocumentByQuery("users", { _id }, { $set: { currency } });
        return Boolean(result);
    } catch (error) {
        return false;
    }
}



module.exports = {
    handleUser: handleUser,
    findUsers: findUsers,
    makeReferral: makeReferral,
    getUser: getUser,
    updatePaymentMethods: updatePaymentMethods,
    changeCurrency: changeCurrency,
};
