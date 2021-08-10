const { telegramDynamoRepository } = require("../repository/index");

const getDailySummaryMessage = async () => {
    const startTime = (Date.now() / 1000);
    const endTime = startTime + 24 * 60 * 60;
    const message = await craftSummaryMessage(startTime, endTime, []);
    return message;
};

const getWeeklySummaryMessage = async () => {
    const startTime = Date.now() / 1000;
    const endTime = startTime + 7 * 24 * 60 * 60;
    const message = await craftSummaryMessage(startTime, endTime, []);
    return message;
};

const craftSummaryMessage = async (startTime, endTime, platforms = []) => {
    let message = "";
    let flagEmpty = true;
    const contestsResponseFromDb =
        await telegramDynamoRepository.queryContestBetweenTime(startTime, endTime);
    const contestsArray = contestsResponseFromDb.Items;
    if (contestsArray.length === 0) {
        return `No upcoming contests! :)`;
    }
    const leetcodeContests = contestsArray.filter(
        (item) => item.platform === "leetcode"
    );
    
    const codeforcesContests = contestsArray.filter(
        (item) => item.platform === "codeforces"
    );
    
    const codechefContests = contestsArray.filter(
        (item) => item.platform === "codechef"
    );

    leetcodeContests.sort((a, b) => {
        return a.start_time - b.start_time;
    });

    codeforcesContests.sort((a, b) => {
        return a.start_time - b.start_time;
    });

    codechefContests.sort((a, b) => {
        return a.start_time - b.start_time;
    });

    if (codeforcesContests.length > 0 && (platforms.includes('codeforces') || platforms.length === 0)) {
        flagEmpty = false;
        message = message + `<b>Codeforces:</b>\n` + getMessageFromContestsArray(codeforcesContests);
    }

    if (codechefContests.length > 0 && (platforms.includes('codechef') || platforms.length === 0)) {
        flagEmpty = false;
        message = message + `<b>Codechef:</b>\n` + getMessageFromContestsArray(codechefContests);
    }

    if (leetcodeContests.length > 0 && (platforms.includes('leetcode') || platforms.length === 0)) {
        flagEmpty = false;
        message = message + `<b>Leetcode:</b>\n` + getMessageFromContestsArray(leetcodeContests);
    }

    if (flagEmpty) {
        return `No upcoming contests! :)`;
    }
    return message;
};

const getMessageFromContestsArray = (contestsArray) => {
    let message = "";
    contestsArray.forEach((contest, i) => {
        message =
            message + `${i + 1}) <a href="${contest.contest_link}">${contest.title}</a> (${getDurationStringFromEpochInSeconds(contest.contest_duration)}) on \n${getHumanReadableDateFromEpoch(contest.start_time * 1000)} ${getTimeAMPM(contest.start_time * 1000)} to ${getTimeAMPM(contest.end_time * 1000)}\nContest ID: ${contest.reminder_id}\n\n`;
    });
    return message;
}

const getReminderMessageFromContestId = async (contestId) => {
    let message = "<b>Reminder 🔔</b>\n\n";
    const contestDetailsDbEntity = await telegramDynamoRepository.getDetailsByContestId(contestId);
    const contestDetails = contestDetailsDbEntity.Item;
    const relativeTimeInMinutes = getRelativeTimeInMinutes(Date.now(), contestDetails.start_time * 1000)
    if (contestDetails) {
        message = message + `<b><i>${contestDetails.title} starts in ${relativeTimeInMinutes} mins.</i></b>\n\n`;
        message = message + `Contest Link: <a href="${contestDetails.contest_link}">${capitalizeFirstLetter(contestDetails.platform)}</a>\n`;
        message = message + `Timing: ${getHumanReadableDateFromEpoch(contestDetails.start_time * 1000)} ${getTimeAMPM(contestDetails.start_time * 1000)} to ${getTimeAMPM(contestDetails.end_time * 1000)}\n\n`;
        message = message + `Happy Coding!! 😎`
        return message
    }
    return '';
}

const getRelativeTimeInMinutes = (currentTime, endTime) => {
    return Math.round((endTime - currentTime) / (60 * 1000));

}

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
const getHumanReadableDateFromEpoch = (epoch, offset = 330 * 60 * 1000) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]
    const date = new Date(epoch + offset);
    return `${days[date.getDay()]} ${getOrdinalNum(date.getDate())} ${month[date.getMonth()]}`
};

const getTimeAMPM = (epoch, offset = 330 * 60 * 1000) => {
    const date = new Date(epoch + offset);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    let strTime = hours + ":" + minutes + " " + ampm;
    return strTime;
};

const getDurationStringFromEpochInSeconds = (epoch) => {
    if (epoch > 24 * 60 * 60) {
        return `${epoch/(24 * 60 * 60)} days`;
    } else {
        return `${epoch/(60 * 60)} hrs`;
    }
}

const getOrdinalNum = (number) => {
    let selector;

    if (number <= 0) {
        selector = 4;
    } else if ((number > 3 && number < 21) || number % 10 > 3) {
        selector = 0;
    } else {
        selector = number % 10;
    }

    return number + ["th", "st", "nd", "rd", ""][selector];
};

module.exports = {
    getDailySummaryMessage,
    getWeeklySummaryMessage,
    getReminderMessageFromContestId,
    craftSummaryMessage,
    getHumanReadableDateFromEpoch
};
