const cron = require('node-cron');
const {telegramService} = require('../services');
let task;

const startSchedule = () => {
    task = cron.schedule('0 7 * * *', () => {
        telegramService.sendDailySummaryAllSubscribedChatIds();
    }, {
        "scheduled": true,
        "timezone": "Asia/Kolkata"
    })
}

const stopSchedule = () => {
    task.stop()
}

module.exports = {
    startSchedule,
    stopSchedule
}