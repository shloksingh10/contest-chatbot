const cron = require('node-cron');
const { leetcodeService, codeforcesService, codechefService} = require('../services');
let task;

const startSchedule = () => {
    leetcodeService.getUpcomingContestsAndUpsert();
    codeforcesService.getUpcomingContestsAndUpsert();
    codechefService.getUpcomingContestsAndUpsert();
    task = cron.schedule('*/60 * * * *', () => {
        console.log('Starting fetching leetcode');
        leetcodeService.getUpcomingContestsAndUpsert();
        console.log('Starting fetching codeforces');
        codeforcesService.getUpcomingContestsAndUpsert();
        console.log('Starting fetching codechef');
        codechefService.getUpcomingContestsAndUpsert();
    })
}

const stopSchedule = () => {
    task.stop()
}

module.exports = {
    startSchedule,
    stopSchedule
}