const axios = require("axios");
const config = require("../config/config");
const FormData = require("form-data");

async function sendMessage(options) {
    try {
        const { to, text, image, buttons } = options
        const form = new FormData();
        form.append('chat_id', to);
        form.append('parse_mode', 'HTML');
        form.append(image ? 'caption' : 'text', text);
        if (buttons) {
            form.append('reply_markup', JSON.stringify({
                inline_keyboard: buttons
            }));

        }
        if (image) {
            form.append('photo', image);
        }
        await axios.post(`${config.tgApiUrl}/send${image ? 'Photo' : 'Message'}`, form,
            { headers: form.getHeaders(), timeout: 5000 });
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}
async function updateMessage(message, options) {
    try {
        const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
        const updateOptions = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            reply_markup: options.reply_markup || message.reply_markup,
        }
        if (hasPhoto) {
            updateOptions.caption = options.text || message.caption;
        } else {
            updateOptions.text = options.text || message.text;
        }
        if (options.dropButtons) {
            updateOptions.reply_markup.inline_keyboard = updateOptions.reply_markup.inline_keyboard.reduce((acc, row) => {
                const filteredRow = row.filter(button => !(button.callback_data || '').includes(options.dropButtons) && !(button.url || '').includes(options.dropButtons));
                if (filteredRow.length > 0) {
                    acc.push(filteredRow);
                }
                return acc;
            }, [])
        }
        const method = hasPhoto ? 'editMessageCaption' : 'editMessageText';
        await axios.post(`${config.tgApiUrl}/${method}`, updateOptions);

        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

module.exports = {
    sendMessage: sendMessage,
    updateMessage: updateMessage,
};