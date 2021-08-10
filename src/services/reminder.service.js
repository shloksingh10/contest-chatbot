const { telegramService } = require('.');
const { telegramDynamoRepository } = require('../repository')
const {getReminderMessageFromContestId} = require('../utils/messageBuilder')
const sendReminders = async () => {
    console.log('Process started for reminders')
    const currentTime = Date.now() / 1000;
    const timeForNextBatch = currentTime + 7 * 60;
    const allRemindersDbEntity = await telegramDynamoRepository.queryAllRemindersLessThanGivenTime(timeForNextBatch);
    const allReminders = allRemindersDbEntity.Items;
    allReminders.forEach(reminderDbEntity => {
        const chatIds = JSON.parse(JSON.stringify(reminderDbEntity.chat_ids));
        const contestId = reminderDbEntity.contest_id
        const reminderTime = reminderDbEntity.reminder_time
        getReminderMessageFromContestId(contestId).then(
            (reminderMessageToSend) => {
                chatIds.forEach(chatId => {
                    telegramService.sendMessage(reminderMessageToSend, chatId);
                });
                telegramDynamoRepository.deleteRemindersByContestId(contestId, reminderTime);
            }
        ); 
    });
}

module.exports = {
    sendReminders
}