const axios = require('axios');
const config = require('../../conf.json')
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const projectId = 'coding-contest-bot-gimu';
const {telegramDynamoRepository} = require('../repository');
const { queryContestDetailsFromReminderId, addNewReminder } = require('../repository/telegramDynamo.repository');
const {getDailySummaryMessage, getWeeklySummaryMessage, craftSummaryMessage, getHumanReadableDateFromEpoch} = require('../utils/messageBuilder')
const botId = config.botId
const sendMessage = async (text, chatId) => {
    const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    }
    const resp = await axios.post(`https://api.telegram.org/${config.telegramToken}/sendMessage`, payload)
    return resp.status
}

const setWebHook = async (url) => {
    const payload = {
        url
    }
    const resp = await axios.post(`https://api.telegram.org/${config.telegramToken}/setWebhook`, payload)
    return resp.status
}

const getUpdates = async (updateBody) => {
    console.log(updateBody);
    if ('my_chat_member' in updateBody) {
        manageChatParticipants(updateBody);
    } 
    if ('message' in updateBody) {
        manageMessage(updateBody);
    }
}

const manageChatParticipants = (updateBody) => {
    const newChatMember = updateBody.my_chat_member.new_chat_member
    if (newChatMember.user.id === botId) {
        if (newChatMember.status === 'member') {
            telegramDynamoRepository.addNewUser((updateBody.my_chat_member.chat.id).toString());
        } else {
            telegramDynamoRepository.deleteUserByChatId((updateBody.my_chat_member.chat.id).toString());
        }
    }
}

const manageMessage = (updateBody) => {
    if ('text' in updateBody.message) {
        const text = updateBody.message.text;
        const chatId =  updateBody.message.chat.id
        handleCommandsForChatId(text, chatId);
    }
}

const handleCommandsForChatId = (command, chatId) => {
    if (command === '/start') {
        handleIntroductionMessage(chatId);
        telegramDynamoRepository.addNewUser(chatId.toString());
        return;
    }
    if (command === ('/today') || command === ('/daily') || command === ('/today@competitive_contest_notifier_bot')) {
        sendDailySummary(chatId);
        return;
    }
    if (command === ('/weekly') || command === ('/summary') || command === ('/summary@competitive_contest_notifier_bot')) {
        sendWeeklySummary(chatId);
        return;
    }
    if (command.charAt(0) === '/') {
        command = command.substring(1);
    }
    analyseChat(command, chatId);
}

const handleAddNewReminder = async (command, chatId) => {
    const remindCommandArray = command.split(' ');
    if (remindCommandArray.length !== 3) {
        sendMessage(`Missing parameters`, chatId);
        return;
    }
    if (isNaN(Number(remindCommandArray[2]))) {
        sendMessage(`Time parameters is not a number`, chatId)
        return;
    }
    const reminderId = remindCommandArray[1];
    const reminderTimeInSecsBeforeContestStarts = remindCommandArray[2] * 60
    const contestDetailsDbEntity = await queryContestDetailsFromReminderId(Number(reminderId));
    console.log(contestDetailsDbEntity)
    if (contestDetailsDbEntity.Items && contestDetailsDbEntity.Items.length > 0) {
        const contestDetail = contestDetailsDbEntity.Items[0];
        const reminderTime = contestDetail.start_time - (reminderTimeInSecsBeforeContestStarts)
        addNewReminder(contestDetail.contest_id, reminderTime, [chatId])
        sendMessage(`${remindCommandArray[2]} mins reminder is set for ${contestDetail.title}!`, chatId)
    } else {
        sendMessage('Cannot find the contest information', chatId)
    }
}

const sendDailySummary = async (chatId, messagePrefix = '') => {
    const summaryMessage = await getDailySummaryMessage();
    sendMessage(messagePrefix + summaryMessage, chatId);
}

const sendWeeklySummary = async (chatId) => {
    const summaryMessage = await getWeeklySummaryMessage();
    sendMessage(summaryMessage, chatId);
}

const sendDailySummaryAllSubscribedChatIds = async () => {
    const allChatIdsRepoResponse = await telegramDynamoRepository.queryAllChatIdsForDailySummary();
    const allChatIds = allChatIdsRepoResponse.Items;
    allChatIds.forEach((chatId) => {
        sendDailySummary(chatId.chat_id, `<b>Eat, Sleep, Code! Here's the list of contests for today: \n\n</b>`);
    })
}


// ALL DIALOGFLOW STUFF GOES HERE FOR NOW TO AVOID CIRCULAR DEPENDENCY

const analyseChat = async (text, chatId) => {
    try {
        const sessionId = uuid.v4();

        const sessionClient = new dialogflow.SessionsClient();
        const sessionPath = sessionClient.projectAgentSessionPath(
            projectId,
            sessionId
        );

        const request = {
            session: sessionPath,
            queryInput: {
            text: {
                text: text,
                languageCode: 'en-US',
            },
            },
        }

        const responses = await sessionClient.detectIntent(request);

        console.log(responses);
        if (responses.length > 0) {
            if (responses[0].queryResult && responses[0].queryResult.intent) {
                console.log((responses[0].queryResult.intent))
                console.log((responses[0].queryResult.parameters))
                if (responses[0].queryResult.intent.displayName === 'contest-reminder') {
                    handleReminderMessage(responses[0].queryResult.parameters, chatId);
                }
                else if (responses[0].queryResult.intent.displayName === 'find-contests') {
                    handleFindContestMessage(responses[0].queryResult.parameters, chatId);
                }
                else if (responses[0].queryResult.intent.displayName === 'about-bot') {
                    handleIntroductionMessage(chatId);
                }
                else if (responses[0].queryResult.intent.displayName === 'tutorial') {
                    handleTutorialMessage(chatId);
                } else {
                    sendMessage(responses[0].queryResult.fulfillmentText, chatId)
                }
            } else {
                console.log("error");
            }
        }
    } catch(e) {
        console.log(e);
    }
}

const handleReminderMessage = async (parameters, chatId) => {
    try {
        if (parameters.fields.number) {
            const reminderId = parameters.fields.number.numberValue
            const timeUnit = parameters.fields.duration.structValue.fields.unit.stringValue;
            const amount = parameters.fields.duration.structValue.fields.amount.numberValue;
            let timeInSeconds;
            if (timeUnit === 'min') {
                timeInSeconds = amount * 60;
            }
            const contestDetailsDbEntity = await telegramDynamoRepository.queryContestDetailsFromReminderId(Number(reminderId));
            if (contestDetailsDbEntity.Items && contestDetailsDbEntity.Items.length > 0) {
                const contestDetail = contestDetailsDbEntity.Items[0];
                const reminderTime = contestDetail.start_time - (timeInSeconds)
                telegramDynamoRepository.addNewReminder(contestDetail.contest_id, reminderTime, [Number(chatId)])
                sendMessage(`${amount} ${timeUnit} reminder is set for ${contestDetail.title}!`, chatId)
            } else {
                sendMessage(`Contest Id: ${reminderId} doesn't exist`, chatId);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

const handleFindContestMessage = async (parameters, chatId) => {
    try {
        if (parameters.fields.date.stringValue !== '') {
            const platformValues = (parameters.fields['contest-platform'].listValue.values);
            const platform = [];
            platformValues.forEach(entity => {
                platform.push(entity.stringValue.toLowerCase());
            })
            const startTime = (Date.parse(parameters.fields.date.stringValue.split('T', 1)[0]) / 1000)
            const endTime = startTime + (24 * 60 * 60);
            console.log(startTime);
            console.log(endTime);
            let message = `<b>Contests on ${getHumanReadableDateFromEpoch(startTime * 1000)}</b>\n \n`
            message = message + await craftSummaryMessage(startTime, endTime, platform);
            sendMessage(message, chatId);
        } else if (parameters.fields['date-period'].structValue) {
            const platformValues = (parameters.fields['contest-platform'].listValue.values);
            const platform = [];
            platformValues.forEach(entity => {
                platform.push(entity.stringValue.toLowerCase());
            })
            const periodFields = parameters.fields['date-period'].structValue.fields
            const startTime = (Date.parse(periodFields.startDate.stringValue.split('T', 1)[0]) / 1000)
            const endTime = (Date.parse(periodFields.endDate.stringValue.split('T', 1)[0]) / 1000)
            let message = `<b>Contests from ${getHumanReadableDateFromEpoch(startTime * 1000)} to ${getHumanReadableDateFromEpoch(endTime * 1000)}</b>\n \n`
            message = message + await craftSummaryMessage(startTime, endTime, platform);
            sendMessage(message, chatId);
        } else {
            const platformValues = (parameters.fields['contest-platform'].listValue.values);
            const platform = [];
            platformValues.forEach(entity => {
                platform.push(entity.stringValue.toLowerCase());
            })
            const startTime = Date.now() / 1000;
            const endTime = startTime + 7 * 24 * 60 * 60;
            let message = `<b>Contests from ${getHumanReadableDateFromEpoch(startTime * 1000)} to ${getHumanReadableDateFromEpoch(endTime * 1000)}</b>\n \n`
            message = message + await craftSummaryMessage(startTime, endTime, platform);
            sendMessage(message, chatId);
        }
    } catch(e) {
        console.log(e);
    }
}

const handleIntroductionMessage = async (chatId) => {
    try {
        let message = `<b>Hi I am ContestNotifierBot</b>\n`;
        message = message + `Am here to help with the information on upcomming contests on various platforms like Codechef, Codeforcers and Leetcode.\n\n`;
        message = message + `I am smart, well I like to think so 😉. So how can I help you today?\n\n`;
        message = message + `Also feel free to contribute and make me more awesome on: <a href="https://github.com/shloksingh10/contest-chatbot">https://github.com/shloksingh10/contest-chatbot</a>`
        sendMessage(message, chatId);
    } catch (e) {

    }
}

const handleTutorialMessage = async (chatId) => {
    try {
        let message = `You can ask me about upcoming contests.\n`
        message = message + `<i>eg: what contests are happening today? or contests this month.\n\n</i>`
        message = message + `Also I can help you set a reminder for a particular contest.\n`;
        message = message + `<i>eg Please set a reminder for contest 10 20 mins before.</i>`;
        sendMessage(message, chatId);
    } catch (e) {

    }
}

module.exports = {
    sendMessage,
    setWebHook,
    getUpdates,
    sendDailySummaryAllSubscribedChatIds
}