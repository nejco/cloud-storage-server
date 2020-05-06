var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  if(req.cookies.jwtToken) {
    res.redirect('/files?path=/');
  }

  res.render('index', { title: 'Log in' , errorMessage: null});
});


module.exports = router;
