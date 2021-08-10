const axios = require("axios");
const { cache } = require('../utils/cache')
const { telegramDynamoRepository } = require('../repository')
const CODEFORCES_NETWORK_CACHE_KEY = 'codeforces_upcoming_contest'
const getUpcomingContestsAndUpsert = async () => {
    let upcomingContestsArray = cache.get(CODEFORCES_NETWORK_CACHE_KEY);

    if (upcomingContestsArray === undefined) {
        try {
            const resp = await axios.get('https://codeforces.com/api/contest.list?gym=false');
            upcomingContestsArray = resp.data.result.filter(contest => contest.relativeTimeSeconds <= 0);
            cache.set(CODEFORCES_NETWORK_CACHE_KEY, upcomingContestsArray, 108000)
        } catch(e) {
            console.log(e);
            return;
        }
    }

    upcomingContestsArray.forEach(upcomingContest => {
        const title = upcomingContest.name;
        const startTime = (upcomingContest.startTimeSeconds);
        const endTime = ((upcomingContest.startTimeSeconds + upcomingContest.durationSeconds));
        const duration = upcomingContest.durationSeconds;
        const url = `https://codeforces.com/contestRegistration/${upcomingContest.id}`
        const contestId = `codeforces-${upcomingContest.id}`
        console.log(title);
        telegramDynamoRepository.addNewContest(contestId, title, startTime, endTime, duration, upcomingContest.type, url, 'codeforces');
    });
};

module.exports = {
    getUpcomingContestsAndUpsert
}