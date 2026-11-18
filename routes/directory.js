const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const createError = require('http-errors');
const fsUtils = require('../utils/FsUtils');
const { requireAuth } = require('../utils/auth');

router.use(requireAuth);

router.post('/new', function (req, res) {
  const user = res.locals.user;
  const parent = fsUtils.validateUserForPath(req.body.path, user);

  if (parent.readOnly) {
    throw createError(403, "You don't have permissions to edit this shared folder.");
  }

  const folderName = fsUtils.safeName(req.body.foldername);
  const target = fsUtils.validateUserForPath(path.posix.join(parent.relativePath, folderName), user, { allowMissing: true });

  if (!fs.existsSync(target.path)) {
    fs.mkdirSync(target.path);
    console.log(`New folder at ${target.path} created.`);
  }

  res.redirect(`/files?path=${encodeURIComponent(parent.relativePath)}`);
});

module.exports = router;
