var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const fsUtils = require('../utils/FsUtils');


const filesRoot = '/Users/nvidrih/cm/cloud-storage-server/files-root';


router.post('/new', function(req, res, next) {

  const token = JSON.parse(req.cookies.jwtToken).token;
  let absolutePath = fsUtils.validateUserForPath(req.body.path, token).path;

  absolutePath = path.join(absolutePath, req.body.foldername);

  if (!fs.existsSync(absolutePath)){
    fs.mkdirSync(absolutePath);
    console.log(`New folder at ${absolutePath} created.`)
    //  TODO: Create metadata dir
  }

  res.redirect(`/files?path=${req.body.path}`);

});

router.post('/delete', function(req, res, next) {

  const token = JSON.parse(req.cookies.jwtToken).token;

  let absolutePath = fsUtils.validateUserForPath(path.join(req.body.path, req.body.name), token).path;

  console.log("Removing file", absolutePath);
  fs.rmdirSync(absolutePath);
  res.redirect(`/files?path=${req.body.path}`);

});


module.exports = router;
