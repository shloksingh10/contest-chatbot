const catchAsync = require("../utils/catchAsync");
const { telegramService } = require("../services");
// const { dialogflowService } = require('../services')

// dialogflowService.analyseChat('remind contest id 10, 30 mins before', '1572110115')

const sendMessage = catchAsync(async (req, res) => {
  const resStatus = await telegramService.sendMessage(req.body.text);
  res.status(resStatus).send();
});

const setWebHook = catchAsync(async (req, res) => {
  const resStatus = await telegramService.setWebHook(req.body.url);
  res.status(resStatus).send();
});

const getUpdates = catchAsync(async (req, res) => {
  await telegramService.getUpdates(req.body)
  res.status(200).send();
});
module.exports = {
  sendMessage,
  setWebHook,
  getUpdates,
};
