var express = require('express');
var router = express.Router();
const fsUtils = require('../utils/FsUtils');

/* GET home page. */
router.get('/', function(req, res, next) {

  if(req.cookies.jwtToken) {
    const username = fsUtils.decodeToken(req.cookies.jwtToken).username;
    res.redirect('/files?path=/' + username);
  } else
    res.render('index', { title: 'Log in' , errorMessage: null});
});


module.exports = router;
