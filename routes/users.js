var express = require('express');
var router = express.Router();
const config = require('../conf/config.json');
var jwt = require('jsonwebtoken');
const crypto = require('crypto');


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/login', function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const hash = crypto.createHash('sha512');
  const data = hash.update(password, 'utf-8');
  const genHash= data.digest('hex');

  if(config.users[username] && config.users[username].password === genHash) {
    jwt.sign({username}, config.jwt.secret, (error, token) => {
      res.cookie('jwtToken', JSON.stringify({token})).redirect("/files?path=/");
    });
  } else {
    res.render('index', {title: 'Log in', errorMessage: "Invalid username or password!"});

    // res.json({error: "Invalid username or password!"});

  }

});

router.get('/logout', function(req, res, next) {
  res.clearCookie("jwtToken");
  res.redirect('/');
});

module.exports = router;
