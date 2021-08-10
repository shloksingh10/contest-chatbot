const AWS = require("aws-sdk");
const {cache, getContestKeyByStartTimeAndEndTime} = require('../utils/cache');
const config = require('../../conf.json')
const CODING_CONTEST_REMINDER_TABLE = "coding-contest-reminder";
const CODING_CONTEST_DETAILS = "coding-contest-details";
const CODING_CONTEST_DAILY_SUMMARY = "coding-contest-daily-summary";
const CODING_CONTEST_SEQUENCE = "coding-contest-sequence";

AWS.config.update({
    region: 'ap-south-1',
    accessKeyId: config.awsAccessKey,
    secretAccessKey: config.awsSecretKey
});

const docClient = new AWS.DynamoDB.DocumentClient();

const addNewReminder = (contestId, reminderTime, chatIdArray) => {
  // check if reminder_id and reminder_time exists already

  const searchPayload = {
    TableName: CODING_CONTEST_REMINDER_TABLE,
    Key: {
      "contest_id": contestId,
      "reminder_time": Number(reminderTime)
    }
  }
  
  return docClient.get(searchPayload).promise().then(
    (item) => {
      if (item.Item) {
        console.log('Already present macha')
        const updatePayload = {
          TableName: CODING_CONTEST_REMINDER_TABLE,
          Key: {
            'contest_id': contestId,
            'reminder_time': Number(reminderTime)
          },
          UpdateExpression: 'ADD chat_ids :chatId',
          ExpressionAttributeValues: {
            ':chatId': docClient.createSet(chatIdArray)
          },
          ReturnValues: 'UPDATED_NEW'
        }
        return docClient.update(updatePayload).promise().then(() => {
          console.log("Updated reminder successfully");
        })
      } else {
        const payload = {
          TableName: CODING_CONTEST_REMINDER_TABLE,
          Item: {
            contest_id: contestId,
            reminder_time: Number(reminderTime),
            chat_ids: docClient.createSet(chatIdArray)
          },
        };
        return docClient.put(payload).promise().then(() => {
          console.log('Inserted reminder successfully')
        })
      }
    }
  )
};

const queryAllRemindersLessThanGivenTime = (epochInSecs) => {
  const payload = {
    TableName: CODING_CONTEST_REMINDER_TABLE,
    FilterExpression: "#rt < :time",
    ExpressionAttributeNames: {
      "#rt": "reminder_time"
    },
    ExpressionAttributeValues: {
      ":time": epochInSecs
    }
  }
  return docClient.scan(payload).promise().then((data) => {
    return data;
  })
} 

const queryContestDetailsFromReminderId = (reminderId) => {
  const keyForReminderToContestIdMap = `REMINDER_TO_CONTEST_ID_MAP_${reminderId}`
  if (cache.get(keyForReminderToContestIdMap)) {
    console.log(`returning contest id details from map`)
    return Promise.resolve(cache.get(keyForReminderToContestIdMap))
  }
  const payload = {
    TableName: CODING_CONTEST_DETAILS,
    FilterExpression: "#ri = :reminder_id",
    ExpressionAttributeNames: {
      "#ri": "reminder_id"
    },
    ExpressionAttributeValues: {
      ":reminder_id": reminderId
    }
  }
  return docClient.scan(payload).promise().then((data) => {
    cache.set(keyForReminderToContestIdMap, data);
    return data;
  })
}

const queryAllChatIdsForDailySummary = () => {
  const keyForDailySummary = 'ALL_CHAT_IDS_DAILY_SUMMARY'
  const payload = {
    TableName: CODING_CONTEST_DAILY_SUMMARY,
    ProjectionExpression: 'chat_id'
  }
  if (cache.get(keyForDailySummary)) {
    console.log(`returning from cache`);
    return Promise.resolve(cache.get(keyForDailySummary))
  }
  return docClient.scan(payload).promise().then((data) => {
    cache.set(keyForDailySummary, data, 1800)
    console.log(data);
    return data;
  })
}

const queryContestBetweenTime = (startTime, endTime) => {
  const keyForContest = getContestKeyByStartTimeAndEndTime(startTime, endTime);
  const payload = {
    TableName: CODING_CONTEST_DETAILS,
    FilterExpression: "(#st between :start_time and :end_time)",
    ExpressionAttributeNames: {
      "#st": "start_time"
    },
    ExpressionAttributeValues: {
      ":start_time": startTime,
      ":end_time": endTime,
    }
  }

  if (cache.get(keyForContest)) {
    console.log(`returning from cache`);
    return Promise.resolve(cache.get(keyForContest))
  }
  return docClient.scan(payload).promise().then((data) => {
    cache.set(keyForContest, data, 1800)
    return data;
  })
}

const addNewContest = (contestId, title, startTime, endTime, contestDuration, contestType, contestLink, platform) => {
  
  // check if contest exists

  const searchPayload = {
    TableName: CODING_CONTEST_DETAILS,
    Key: {
      "contest_id": contestId
    }
  }

  return docClient.get(searchPayload).promise().then(
    item => {
      if (item.Item) {
        // item exists just upsert entries without incrementing reminder sequence id
        const updatePayload = {
          TableName: CODING_CONTEST_DETAILS,
          Key: {
            contest_id: contestId
          },
          UpdateExpression: "set start_time = :st, end_time = :et, contest_duration = :d, title = :t",
          ExpressionAttributeValues: {
            ":st": startTime,
            ":et": endTime,
            ":d": contestDuration,
            ":t": title
          },
          ReturnValues:"UPDATED_NEW"
        }
        docClient.update(updatePayload).promise().then(() => {
          console.log("Updated successfully");
        })
      } else {
        // item doesn't exists add entries with incrementing reminder sequence id
        const sequencePayload = {
          TableName: CODING_CONTEST_SEQUENCE,
          Key: {
            "id": "1"
          },
          UpdateExpression: "set sequence_number = sequence_number + :val",
          ExpressionAttributeValues: {
            ":val": 1
          },
          ReturnValues:"UPDATED_NEW"
        }

        docClient.update(sequencePayload).promise().then((data) => {
          const reminderId = data.Attributes.sequence_number
          const insertPayload = {
            TableName: CODING_CONTEST_DETAILS,
            Item: {
              contest_id: contestId,
              title,
              start_time: startTime,
              end_time: endTime,
              contest_duration: contestDuration,
              contest_type: contestType, 
              contest_link: contestLink,
              platform: platform,
              reminder_id: reminderId
            },
          };
          docClient.put(insertPayload).promise().then(() => {
            console.log('Inserted successfully')
          });
        });
      }
    }
  )
};

const addNewUser = (chatId, leetcodeSummary = true, codeforcesSummary = true, hackerearthSummary = true, codechefSummary = true) => {
  const payload = {
    TableName: CODING_CONTEST_DAILY_SUMMARY,
    Item: {
      chat_id: chatId,
      leetcode_summary: leetcodeSummary,
      codeforces_summary: codeforcesSummary,
      hackerearth_summary:hackerearthSummary,
      codechef_summary: codechefSummary
    },
  };

  return docClient.put(payload).promise()
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
};

const deleteUserByChatId = (chatId) => {
  const payload = {
    TableName: CODING_CONTEST_DAILY_SUMMARY,
    Key: {
      chat_id: chatId
    },
  };

  return docClient.delete(payload).promise()
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
};

const deleteRemindersByContestId = (contestId, reminderTime) => {
  const payload = {
    TableName: CODING_CONTEST_REMINDER_TABLE,
    Key: {
      contest_id: contestId,
      reminder_time: reminderTime
    },
  };

  return docClient.delete(payload).promise()
    .then((data) => {
      return data
    })
    .catch((err) => {
      console.log(err);
    });
};


const deleteContestByContestId = (contestId) => {
  const payload = {
    TableName: CODING_CONTEST_DETAILS,
    Key: {
      contest_id: contestId
    },
  };

  return docClient.delete(payload).promise()
    .then((data) => {
      return data
    })
    .catch((err) => {
      console.log(err);
    });
};

const getDetailsByContestId = (contestId) => {
  const keyForContestDetails = `CONTEST_DETAILS_CONTEST_ID:${contestId}`
  if (cache.get(keyForContestDetails)) {
    return Promise.resolve(cache.get(keyForContestDetails))
  }
  const payload = {
    TableName: CODING_CONTEST_DETAILS,
    Key: {
      contest_id: contestId
    },
  };

  return docClient.get(payload).promise()
    .then((data) => {
      cache.set(keyForContestDetails, data, 3600)
      return data;
    })
    .catch((err) => {
      console.log(err);
    });
};


module.exports = {
  addNewReminder,
  addNewContest,
  addNewUser,
  deleteUserByChatId,
  deleteContestByContestId,
  deleteRemindersByContestId,
  getDetailsByContestId,
  queryContestBetweenTime,
  queryAllChatIdsForDailySummary,
  queryContestDetailsFromReminderId,
  queryAllRemindersLessThanGivenTime
}
