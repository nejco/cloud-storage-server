var express = require('express');
var router = express.Router();
const fsUtils = require('../utils/FsUtils');

router.use(function (req, res, next) {
  if(!req.cookies.jwtToken) {
    return res.render('index', { title: 'Log in' , errorMessage: null});
  }

  try {
    token = JSON.parse(req.cookies.jwtToken).token;
    fsUtils.decodeToken(token)
  } catch (error) {
    throw new Error(error)
  }
  next();
})


/* GET home page. */
router.get('/', function(req, res, next) {
  const validationResult = fsUtils.decodeToken(token);

  const fullPath = validationResult.path ;
  const username = validationResult.username;

    res.render('settings', { title: 'Settings' , username});

});


module.exports = router;
