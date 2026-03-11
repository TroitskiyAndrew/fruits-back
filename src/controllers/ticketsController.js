const dataService = require("../services/mongodb");
const eventsService = require("../services/eventsService");
const citiesService = require("../services/citiesService");
const ticketsService = require("../services/ticketsService");
const utils = require("../services/utils");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const config = require("../config/config");
const axios = require("axios");
const QRCode = require("qrcode");
const { ObjectId } = require("mongodb");

const eventsMap = new Map();
const placesMap = new Map();

const buyTickets = async (req, res) => {
  try {
    const { currency, tickets: ticketsString } = req.body;
    const { user } = req.telegramData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const bookingId = crypto.randomBytes(10).toString('base64url');
    const tickets = ticketsString ? JSON.parse(ticketsString) : [];
    const dbUser = await dataService.getDocumentByQuery('user', { userId: user.id });
    const sources = dbUser?.sources || [];
    const newTickets = tickets.map(ticket => ({
      userId: user.id,
      event: ticket.eventId,
      bookingId,
      type: ticket.type,
      currency,
      method: 'bank',
      price: ticket.price,
      cashier: config.cashier,
      confirmed: false,
      add: ticket.add,
      combo: ticket.combo,
      source: ticket.source || dbUser?.source || '',
      lastSource: sources[sources.length - 1] || '',
      path: dbUser?.path ?? [],
      sent: false,
      discount: ticket.discount,
      checked: false
    }));
    await dataService.createDocuments('ticket', newTickets);
    const form = new FormData();
    form.append('chat_id', config.cashier);
    form.append('parse_mode', 'HTML');
    if (req.file) {
      form.append('photo', fs.createReadStream(req.file.path));
    } else {
      form.append('photo', 'https://www.dropbox.com/scl/fi/gll6m7uuzwi37cb6379bl/zhdun.jpg?rlkey=xmm48wmk0ri4ckudm5bde23ez&raw=1');
    }
    const userLink = `<a href="https://t.me/${user.username}">${user.first_name || user.username || 'Пользователь'}</a>`;
    const total = tickets.reduce((acc, ticket) => acc += ticket.price, 0);
    const ticketStrings = []
    for (const ticket of newTickets) {
      const event = await eventsService.getEventFromCache(ticket.event);
      ticketStrings.push(`${citiesService.citiesMap.get(event.city).name} ${event.date} ${config.eventTypes[event.type]} - ${config.ticketTypes[ticket.type]}`)
    };
    const source = dbUser?.source || '';
    const notifySources = [...new Set([source, sources[sources.length - 1]].filter(Boolean))].join('/')
    form.append('caption', `Оплата от ${userLink} за билеты:\n${ticketStrings.join(',\n')}.\nНа общую сумму ${total}${currency === 'VND' ? '.000 VND' : currency === 'RUB' ? ' руб' : ' USDT'}${notifySources ? '\nОт ' + notifySources : ''}`);
    form.append('reply_markup', JSON.stringify({
      inline_keyboard: [
        [{ text: "Подтвердить", callback_data: `CONFIRM_SPLIT_${bookingId}` }],
        [{ text: "Неправильная сумма", callback_data: `WRONG_SPLIT_${bookingId}` }],
        [{ text: "Маркетинговые билеты", callback_data: `MARKETING_SPLIT_${bookingId}` }],
        [{ text: "Деньги не поступили", callback_data: `DROP_SPLIT_${bookingId}` }]
      ]
    }));
    await axios.post(`${config.tgApiUrl}/sendPhoto`, form,
      { headers: form.getHeaders() });

    res.status(200).send(newTickets);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const sellTickets = async (req, res) => {
  try {
    const { currency, tickets, userId, cashier, checked, sendTo, method } = req.body;
    const { user } = req.telegramData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const dbCashier = (await dataService.getDocumentByQuery('user', { userId: cashier })) || { user: {} };
    const dbCashierUser = dbCashier.user;
    const bookingId = crypto.randomBytes(10).toString('base64url');
    const dbUser = await dataService.getDocumentByQuery('user', { userId })
    const fakeUser = userId === 555;
    const sources = dbUser?.sources || [];
    const newTickets = tickets.map(ticket => ({
      userId,
      event: ticket.eventId,
      bookingId,
      type: ticket.type,
      currency,
      method,
      price: ticket.price,
      cashier: method === 'cash' ? cashier : config.cashier,
      confirmed: true,
      add: ticket.add,
      combo: ticket.combo,
      source: fakeUser ? "" : dbUser?.source || '' ,
      lastSource: fakeUser ? "" : sources[sources.length - 1] || '',
      path: fakeUser ? [] : dbUser?.path ?? [],
      
      sent: false,
      discount: ticket.discount,
      checked,
    }));
    await dataService.createDocuments('ticket', newTickets);
    await ticketsService.sendTickets({ bookingId }, { marketing: tickets[0].type === 0, sendTo });

    const total = tickets.reduce((acc, ticket) => acc += ticket.price, 0);
    const ticketStrings = []
    for (const ticket of tickets) {
      const event = await eventsService.getEventFromCache(ticket.eventId);
      ticketStrings.push(`${citiesService.citiesMap.get(event.city).name} ${event.date} ${config.eventTypes[event.type]} - ${config.ticketTypes[ticket.type]}`)
    };
    const source = fakeUser ? "" : dbUser?.source || '';
    const notifySources = [...new Set([source, sources[sources.length - 1]].filter(Boolean))].join('/')
    const userLink = `<a href="https://t.me/${dbUser?.user?.username}">${dbUser?.user?.first_name || dbUser?.user?.username || 'Пользователь'}</a>`;
    const cashierLink = `<a href="https://t.me/${dbCashierUser.username}">${dbCashierUser.first_name || dbCashierUser.username || 'Пользователь'}</a>`;
    const info = `${cashierLink} продал ${userLink}:\n${ticketStrings.join(',\n')}.\nНа общую сумму ${total}${currency === 'VND' ? '.000 VND' : currency === 'RUB' ? ' руб' : ' USDT'}${notifySources ? '\nОт ' + notifySources : ''}`
    for (const notify of config.salesNotifications) {
      await axios.post(`${config.tgApiUrl}/sendMessage`, {
        chat_id: notify,
        text: info,
        parse_mode: 'HTML',
      });
    }
    res.status(200).send(newTickets);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const getTickets = async (req, res) => {
  try {
    const { user } = req.telegramData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const tickets = await dataService.getDocuments('ticket', { userId: user.id });
    for (const ticket of tickets) {
      await updateTicket(ticket);
    }
    res.status(200).send(tickets);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const getTicketsByBooking = async (req, res) => {
  try {
    const { user } = req.telegramData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const tickets = await dataService.getDocuments('ticket', { bookingId: req.params.bookingId });
    for (const ticket of tickets) {
      await updateTicket(ticket);
    }
    res.status(200).send(tickets);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const getTicket = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const ticket = await dataService.getDocument('ticket', ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    await updateTicket(ticket);
    res.status(200).send(ticket);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

async function updateTicket(ticket) {
  if (eventsMap.has(ticket.event)) {
    const event = eventsMap.get(ticket.event);
    ticket.event = event;
  } else {
    const event = await dataService.getDocument('event', ticket.event);
    eventsMap.set(ticket.event, event);
    ticket.event = event;
    ticket.add = event.tickets.find(t => t.type === ticket.type)?.add || '';
  }
  if (citiesService.citiesMap.has(ticket.event.city)) {
    const city = citiesService.citiesMap.get(ticket.event.city);
    ticket.city = city;
  } else {
    const city = await dataService.getDocument('city', ticket.event.city);
    citiesService.citesMap.set(ticket.event.city, city);
    ticket.city = city;
  }
  if (placesMap.has(ticket.event.place)) {
    const place = placesMap.get(ticket.event.place);
    ticket.place = place;
  } else {
    const place = await dataService.getDocument('place', ticket.event.place);
    placesMap.set(ticket.event.place, place);
    ticket.place = place;
  }
  return ticket;
}

const getQR = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    const link = `${config.ticketUrlBase}${ticketId}`;

    res.setHeader('Content-Type', 'image/png');

    await QRCode.toFileStream(res, link, {
      type: 'png',
      width: 512,
      margin: 2,
    });
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const getSoldTickets = async (req, res) => {
  try {
    const tickets = await dataService.getDocuments('ticket', { event: req.params.eventId, confirmed: true });
    res.status(200).send(tickets);
    return;
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

const changeTicketStatus = async (req, res) => {
  try {
    let result = false;
    const { user } = req.telegramData;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { ticketId, inside } = req.body;
    const ticket = await dataService.getDocument('ticket', ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    const event = await eventsService.getEventFromCache(ticket.event);
    if (!event) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    if ((event.entrance || []).includes(user.id)) {
      await dataService.updateDocumentByQuery('ticket', { _id: new ObjectId(ticketId) }, { $set: { checked: inside } })
      ticket.checked = inside;
      result = true;
    }

    res.status(200).send(result);
  } catch (error) {
    console.log(error)
    res.status(500).send(error);
    return;
  }
};

module.exports = {
  buyTickets: buyTickets,
  getTickets: getTickets,
  getTicket: getTicket,
  getQR: getQR,
  getSoldTickets: getSoldTickets,
  sellTickets: sellTickets,
  changeTicketStatus: changeTicketStatus,
  getTicketsByBooking: getTicketsByBooking,
};
