const express = require('express');
const telegramRoute = require('./telegram.route');

const router = express.Router();

const defaultRoutes = [
    {
        path: '/telegram',
        route: telegramRoute
    }
]

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
})

module.exports = router