const cron = require('node-cron');
const {reminderService} = require('../services');
let task;

const startSchedule = () => {
    reminderService.sendReminders();
    task = cron.schedule('*/5 * * * *', () => {
        reminderService.sendReminders();
    })
}

const stopSchedule = () => {
    task.stop()
}

module.exports = {
    startSchedule,
    stopSchedule
}