const express = require('express')
const telegramController = require('../controllers/telegram.controllers')
const router = express.Router();

router.route('/').get((req, res) => {
    res.json({"comment": req.path})
})

router.route('/sendMessage').post(telegramController.sendMessage)

router.route('/setWebHook').post(telegramController.setWebHook)

router.route('/getUpdates').post(telegramController.getUpdates)

module.exports = router;