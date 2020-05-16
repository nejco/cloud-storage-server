const express = require('express');
const router = express.Router();
const config = require('../conf/config.json');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fsUtils = require('../utils/FsUtils');

router.post('/login', function(req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const hash = crypto.createHash('sha512');
  const data = hash.update(password, 'utf-8');
  const genHash= data.digest('hex');

  if(config.users[username] && config.users[username].password === genHash) {
    // add shared folders
    const sharedFolders = require('../conf/shared.json');

    const sharedWithMe = sharedFolders.shared
        .filter(entry =>  entry.sharedWith === username )
        .map(entry => {

          const relativePath = path.join('/', entry.owner, entry.path);

          // validate if owner has rights to shared folder
          fsUtils.stripPath( relativePath, entry.owner);

          return {
            path: relativePath,
            readOnly: entry.readOnly,
            owner: entry.owner
          }
        });

    jwt.sign({username, shared: sharedWithMe}, config.jwt.secret, (error, token) => {
      if(error) {
        throw error;
      } else
        res.cookie('jwtToken', JSON.stringify({token})).redirect("/files?path=/" + username);
    });

  } else {
    res.render('index', {title: 'Log in', errorMessage: "Invalid username or password!"});
  }

});

router.get('/logout', function(req, res, next) {
  res.clearCookie("jwtToken");
  res.redirect('/');
});

module.exports = router;
