const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const fsUtils = require('../utils/FsUtils');
const sharp = require('sharp');
let token = {};

const itemsPerPage = 10; // TODO dynamic

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

router.get('/', function(req, res, next) {

  const absolutePath = req.query.path;
  const validationResult = fsUtils.validateUserForPath(absolutePath, token);

  const fullPath = validationResult.path ;
  const username = validationResult.username;

  const page = Number(req.query.page) ? Number(req.query.page): 1;
  const parentDir =  absolutePath.split('/').slice(0, -1).join('/');

  const escapedPath = absolutePath.split('/').map(item => encodeURIComponent(item)).join('/');

  fs.readdir(fullPath, (err, files) => {

    let detailedFiles = files.filter(name => !name.startsWith('.')).map(file => {
      const lstatFile = fsUtils.validateUserForPath(path.join(absolutePath, file), token).path;

      const stat = fs.lstatSync(lstatFile);
      return {
        name: file,
        path: absolutePath,
        escapedPath,
        details: {
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
          size: stat.size,
          birthtime: stat.birthtimeMs
        }
      }
    });

    const numerOfPages = Math.ceil(detailedFiles.length / itemsPerPage);

    if(numerOfPages >= 2)
      detailedFiles = detailedFiles.slice((page-1) * itemsPerPage, (page-1) * itemsPerPage + itemsPerPage);

    res.render('files',
        {
          title: 'Files viewer' ,
          path: absolutePath,
          files: detailedFiles,
          parentDir,
          username,
          page,
          itemsPerPage,
          numerOfPages
        });

  })

});



router.post('/upload', function(req, res, next) {

  console.log("Uploaded file ", req.files);

  const validationResult = fsUtils.validateUserForPath(req.body.path, token);
  const absolutePath = validationResult.path;

  if(validationResult.readOnly) {
    throw new Error("You don't have permissions to edit this shared folder.")
  }

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


router.get('/get/:fileName', function(req, res, next) {
  const absolutePath = path.join(req.query.path, req.params.fileName);
  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;
  res.sendFile(filePath);

});

router.get('/get/preview/:fileName', function(req, res, next) {
  const absolutePath = path.join(req.query.path, req.params.fileName);

  const filePath = fsUtils.validateUserForPath(absolutePath, token).path;

  // TODO make this as an option in GUI
  sharp(filePath).resize(500).rotate().toBuffer().then(buff => {

    res.end(buff, 'base64');

  }).catch(error => {
    res.json({error: error.toString()})
  })

});

router.post('/delete', function(req, res, next) {

  const fullPath = req.body.path;
  const selectedItems = Object.keys(req.body).filter(item => item !== 'path');


  for(let item of selectedItems) {
    const absolutePath = path.join(fullPath, item);
    const validationResult = fsUtils.validateUserForPath(absolutePath, token);

    const filePath = validationResult.path;

    if(validationResult.readOnly) {
      throw new Error("You don't have permissions to edit this shared folder.")
    }

    console.error('removing file at path', absolutePath)

    if(fs.lstatSync(filePath).isDirectory()) {
      fs.rmdirSync(filePath);
    } else if (fs.lstatSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    } else {
      throw new Error(`Could not delete ${filePath}. Unknown target type!`)
    }
  }

  res.redirect(`/files?path=${req.body.path}`);
});

router.get('/shared', function(req, res, next) {

  const decodedToken = fsUtils.decodeToken(token);

  const sharedFolders = decodedToken.shared.map(item => {

    return {
      path: item.path,
      owner: item.owner,
      details: {
        isFile: false,
        isDirectory: true,
      }
    };

  })

  res.render('shared', {
    title: 'Shared folders' ,
    folders: sharedFolders,
    username: decodedToken.username
  });

});

module.exports = router;
