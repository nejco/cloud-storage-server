const express = require('express');
const router = express.Router();
const config = require('../conf/config.json');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fsUtils = require('../utils/FsUtils');

function passwordMatches(user, password) {
  if (!user || typeof user.password !== 'string' || typeof password !== 'string') {
    return false;
  }
  const genHash = crypto.createHash('sha512').update(password, 'utf-8').digest();
  const stored = Buffer.from(user.password, 'hex');
  return stored.length === genHash.length && crypto.timingSafeEqual(stored, genHash);
}

router.post('/login', function (req, res, next) {
  const username = req.body.username;
  const password = req.body.password;

  const user = typeof username === 'string' && Object.hasOwn(config.users, username) ? config.users[username] : null;

  if (!passwordMatches(user, password)) {
    return res.status(401).render('index', { title: 'Log in', errorMessage: 'Invalid username or password!' });
  }

  // add shared folders
  const sharedFolders = require('../conf/shared.json');

  const sharedWithMe = sharedFolders.shared
    .filter(entry => entry.sharedWith === username)
    .map(entry => {
      const relativePath = fsUtils.normalizeRelative(path.posix.join('/', entry.owner, entry.path));

      // validate if owner has rights to shared folder
      fsUtils.stripPath(relativePath, entry.owner);

      return {
        path: relativePath,
        readOnly: entry.readOnly,
        owner: entry.owner
      };
    });

  const ttl = Number(config.jwt.ttl) > 0 ? Number(config.jwt.ttl) : undefined;

  jwt.sign({ username, shared: sharedWithMe }, config.jwt.secret, ttl ? { expiresIn: ttl } : {}, (error, token) => {
    if (error) {
      return next(error);
    }
    res.cookie('jwtToken', JSON.stringify({ token }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      ...(ttl ? { maxAge: ttl * 1000 } : {})
    }).redirect('/files?path=' + encodeURIComponent('/' + username));
  });
});

router.get('/logout', function (req, res) {
  res.clearCookie('jwtToken');
  res.redirect('/');
});

module.exports = router;
