const axios = require("axios");
const {cache} = require('../utils/cache')
const {telegramDynamoRepository} = require('../repository')
const LEETCODE_NETWORK_CACHE_KEY = 'leetcode_upcoming_contest'
const getUpcomingContestsAndUpsert = async () => {
  const payload = {
    operationName: null,
    variables: {},
    query:
      `{\n  brightTitle\n  currentTimestamp\n  upcomingContests {\n    title\n    titleSlug\n      startTime\n    duration\n    isVirtual\n    company {\n      watermark\n      __typename\n    }\n    __typename\n  }\n}\n`,
  };
  
  let upcomingContestsArray = cache.get(LEETCODE_NETWORK_CACHE_KEY);

  if (upcomingContestsArray === undefined) {
    try {
      const resp = await axios.post('https://leetcode.com/graphql', payload);
      upcomingContestsArray = resp.data.data.upcomingContests;
      cache.set(LEETCODE_NETWORK_CACHE_KEY, upcomingContestsArray, 108000)
    }  catch(e) {
      console.log(e);
      return;
    }
  }

  upcomingContestsArray.forEach(upcomingContest => {
      const title = upcomingContest.title;
      const startTime = (upcomingContest.startTime);
      const endTime = ((upcomingContest.startTime + upcomingContest.duration));
      const duration = upcomingContest.duration;
      const url = `https://leetcode.com/contest/${upcomingContest.titleSlug}`
      const contestId = `leetcode-${upcomingContest.titleSlug}`
      const type = (duration > (12 * 60 * 60)? 'Long': 'Short');
      console.log(title);
      telegramDynamoRepository.addNewContest(contestId, title, startTime, endTime, duration, type, url, 'leetcode');
  });
};

const deleteAllUpcomingContests = async () => {
    // TODO make delete repo call
    
}

module.exports = {
    getUpcomingContestsAndUpsert
}