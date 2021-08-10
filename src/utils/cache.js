const NodeCache = require( "node-cache" )
const cache = new NodeCache();

const getContestKeyByStartTimeAndEndTime = (startTime, endTime) => {
  return `contest-${startTime}#${endTime}`;
}

module.exports = {
    cache,
    getContestKeyByStartTimeAndEndTime
  }