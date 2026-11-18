const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/auth');

router.use(requireAuth);

router.get('/', function (req, res) {
  res.render('settings', { title: 'Settings', username: res.locals.user.username });
});

module.exports = router;
