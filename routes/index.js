const express = require('express');
const router = express.Router();
const { readUser } = require('../utils/auth');

/* GET home page. */
router.get('/', function (req, res) {
  const user = readUser(req);
  if (user) {
    return res.redirect('/files?path=' + encodeURIComponent('/' + user.username));
  }
  res.clearCookie('jwtToken');
  res.render('index', { title: 'Log in', errorMessage: null });
});

module.exports = router;
