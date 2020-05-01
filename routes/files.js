var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const fsUtils = require('../utils/FsUtils');
const sharp = require('sharp');


/* GET home page. */
router.get('/', function(req, res, next) {

  console.log(req.query);
  const token = JSON.parse(req.cookies.jwtToken).token;
  console.log('token', token);


  const absolutePath = req.query.path;
  const validationResult = fsUtils.validateUserForPath(absolutePath, token);

  const fullPath = validationResult.path ;
  const username = validationResult.username;

  fs.readdir(fullPath, (err, files) => {

    const detailedFiles = files.filter(name => !name.startsWith('.')).map(file => {
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

    res.render('files', { title: 'Files viewer' , path: absolutePath, files: detailedFiles, username});

  })

});



router.post('/upload', function(req, res, next) {

  console.log("Uploaded file ", req.files);

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = fsUtils.validateUserForPath(req.body.path, token).path;


  req.files.sampleFile.map(file => {
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

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = req.query.path;

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;

  res.sendFile(filePath);

});

router.get('/get/preview', function(req, res, next) {

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = req.query.path;

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;

  sharp(filePath).resize(500).toBuffer().then(buff => {

    res.end(buff, 'base64');

  }).catch(error => {
    res.json({error: error.toString()})
  })

});

router.post('/delete', function(req, res, next) {

  const token = JSON.parse(req.cookies.jwtToken).token;
  const absolutePath = path.join(req.body.path, req.body.name);

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;


  console.log("Removing file", filePath);
  fs.unlinkSync(filePath);
  res.redirect(`/files?path=${req.body.path}`);
});


module.exports = router;
