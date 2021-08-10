const axios = require("axios");
const { cache } = require('../utils/cache')
const { telegramDynamoRepository } = require('../repository')
const CODECHEF_NETWORK_CACHE_KEY = "codechef_upcoming_contest";
const getUpcomingContestsAndUpsert = async () => {
    let upcomingContestsArray = cache.get(CODECHEF_NETWORK_CACHE_KEY);

    if (upcomingContestsArray === undefined) {
        try {
            const resp = await axios.get('https://www.codechef.com/api/list/contests/future?sort_by=END&sorting_order=desc&offset=0&mode=premium');
            upcomingContestsArray = resp.data.contests;
            cache.set(CODECHEF_NETWORK_CACHE_KEY, upcomingContestsArray, 108000)
        } catch(e) {
            console.log(e);
            return;
        }
    }

    upcomingContestsArray.forEach(upcomingContest => {
        const title = upcomingContest.contest_name;
        const startTime = (Date.parse(upcomingContest.contest_start_date_iso) / 1000 );
        const endTime = (Date.parse(upcomingContest.contest_end_date_iso) / 1000);
        const duration = endTime - startTime;
        const url = `https://www.codechef.com/${upcomingContest.contest_code}`
        const contestId = `codechef-${upcomingContest.contest_code}`
        const type = (duration > (12 * 60 * 60)? 'Long': 'Short');
        console.log(title);
        telegramDynamoRepository.addNewContest(contestId, title, startTime, endTime, duration, type, url, 'codechef');
    });
};

module.exports = {
    getUpcomingContestsAndUpsert
}