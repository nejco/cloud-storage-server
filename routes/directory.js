var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const fsUtils = require('../utils/FsUtils');

let token = {};
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


router.post('/new', function(req, res, next) {
  let absolutePath = fsUtils.validateUserForPath(req.body.path, token).path;

  absolutePath = path.join(absolutePath, req.body.foldername);

  if (!fs.existsSync(absolutePath)){
    fs.mkdirSync(absolutePath);
    console.log(`New folder at ${absolutePath} created.`)
  }

  res.redirect(`/files?path=${req.body.path}`);

});

module.exports = router;
