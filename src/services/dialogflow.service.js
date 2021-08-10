// const dialogflow = require('@google-cloud/dialogflow');
// const {telegramDynamoRepository} = require('../repository');
// const uuid = require('uuid');
// const projectId = 'coding-contest-bot-gimu';
// const analyseChat = async (text, chatId) => {
//     const sessionId = uuid.v4();

//     const sessionClient = new dialogflow.SessionsClient();
//     const sessionPath = sessionClient.projectAgentSessionPath(
//         projectId,
//         sessionId
//     );

//     const request = {
//         session: sessionPath,
//         queryInput: {
//           text: {
//             text: text,
//             languageCode: 'en-US',
//           },
//         },
//       }

//     const responses = await sessionClient.detectIntent(request);

//     console.log(responses);
//     if (responses.length > 0) {
//         if (responses[0].queryResult && responses[0].queryResult.intent) {
//             if (responses[0].queryResult.intent.displayName === 'contest-reminder') {
//                 handleReminderMessage(responses[0].queryResult.parameters, chatId);
//             }
//         } else {
//             console.log("error");
//         }
//     }
//     console.log(responses[0].queryResult.intent);
//     console.log(responses[0].queryResult.parameters);
// }

// const handleReminderMessage = async (parameters, chatId) => {
//     if (parameters.fields.number) {
//         const reminderId = parameters.fields.number.numberValue
//         const timeUnit = parameters.fields.duration.structValue.fields.unit.stringValue;
//         const amount = parameters.fields.duration.structValue.fields.amount.numberValue;
//         let timeInSeconds;
//         if (timeUnit === 'min') {
//             timeInSeconds = amount * 60;
//         }
//         const contestDetailsDbEntity = await telegramDynamoRepository.queryContestDetailsFromReminderId(Number(reminderId));
//         if (contestDetailsDbEntity.Items && contestDetailsDbEntity.Items.length > 0) {
//             const contestDetail = contestDetailsDbEntity.Items[0];
//             const reminderTime = contestDetail.start_time - (timeInSeconds)
//             telegramDynamoRepository.addNewReminder(contestDetail.contest_id, reminderTime, [chatId])
//             // telegramService.sendMessage(`${amount} ${timeUnit} reminder is set for ${contestDetail.title}!`, chatId)
//         } else {
//             // telegramService.sendMessage(`Contest Id: ${reminderId} doesn't exist`, chatId);
//         }
//     }
// }

// module.exports = {
//     analyseChat
// }