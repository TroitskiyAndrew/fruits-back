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
        if(image){
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

module.exports = {
    sendMessage: sendMessage,
};