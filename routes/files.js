var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const fsUtils = require('../utils/FsUtils');
const sharp = require('sharp');

const itemsPerPage = 10;

/* GET home page. */
router.get('/', function(req, res, next) {

  if(!req.cookies.jwtToken) {
    throw new Error('You are not logged in!');
  }

  const token = JSON.parse(req.cookies.jwtToken).token;


  const absolutePath = req.query.path;
  const validationResult = fsUtils.validateUserForPath(absolutePath, token);

  const fullPath = validationResult.path ;
  const username = validationResult.username;

  const page = Number(req.query.page) ? Number(req.query.page): 1;


  fs.readdir(fullPath, (err, files) => {

    let detailedFiles = files.filter(name => !name.startsWith('.')).map(file => {
      const lstatFile = fsUtils.validateUserForPath(path.join(absolutePath, file), token).path;

      const stat = fs.lstatSync(lstatFile);
      return {
        name: file,
        path: path.join(absolutePath, file),
        details: {
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
          size: stat.size,
          birthtime: stat.birthtimeMs
        }
      }
    });

    const numerOfPages = Math.ceil(detailedFiles.length / itemsPerPage);

    if(numerOfPages > 0)
      detailedFiles = detailedFiles.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

    res.render('files',
        {
          title: 'Files viewer' ,
          path: absolutePath,
          files: detailedFiles,
          username,
          page,
          itemsPerPage,
          numerOfPages
        });

  })

});



router.post('/upload', function(req, res, next) {

  console.log("Uploaded file ", req.files);

  if(!req.cookies.jwtToken) {
    throw new Error('You are not logged in!');
  }

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = fsUtils.validateUserForPath(req.body.path, token).path;

  const filesArray = Array.isArray(req.files.sampleFile) ? req.files.sampleFile: [req.files.sampleFile];

  filesArray.map(file => {
    if(file.name.includes('..')) {
      throw new Error(`Invalid file name ${file.name}`);
    }

    const fullPath = path.join(absolutePath, file.name);
    console.log("fullPath", fullPath);

    file.mv(fullPath, function(err) {
      if (err)
        return res.status(500).send(err);
    });

  });

  res.redirect(`/files?path=${req.body.path}`);

});


router.get('/get', function(req, res, next) {

  if(!req.cookies.jwtToken) {
    throw new Error('You are not logged in!');
  }

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = req.query.path;

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;

  res.sendFile(filePath);

});

router.get('/get/preview', function(req, res, next) {

  if(!req.cookies.jwtToken) {
    throw new Error('You are not logged in!');
  }

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = req.query.path;

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;

  sharp(filePath).resize(500).rotate().toBuffer().then(buff => {

    res.end(buff, 'base64');

  }).catch(error => {
    res.json({error: error.toString()})
  })

});

router.post('/delete', function(req, res, next) {

  if(!req.cookies.jwtToken) {
    throw new Error('You are not logged in!');
  }

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = path.join(req.body.path, req.body.name);

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;


  console.log("Removing file", filePath);
  fs.unlinkSync(filePath);
  res.redirect(`/files?path=${req.body.path}`);
});


module.exports = router;
