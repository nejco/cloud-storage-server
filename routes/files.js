const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const createError = require('http-errors');
const sharp = require('sharp');
const fsUtils = require('../utils/FsUtils');
const { requireAuth } = require('../utils/auth');

const itemsPerPage = 50; // TODO dynamic

router.use(requireAuth);

const filesUrl = (relativePath) => `/files?path=${encodeURIComponent(relativePath)}`;

router.get('/', async function (req, res) {
  const validationResult = fsUtils.validateUserForPath(req.query.path, res.locals.user);

  const fullPath = validationResult.path;
  const relativePath = validationResult.relativePath;
  const username = validationResult.username;

  if (!fs.statSync(fullPath).isDirectory()) {
    throw createError(400, 'Not a folder');
  }

  const page = Number(req.query.page) > 0 ? Math.floor(Number(req.query.page)) : 1;
  const parentDir = relativePath.split('/').slice(0, -1).join('/');
  const escapedPath = relativePath.split('/').map(item => encodeURIComponent(item)).join('/');

  const names = await fs.promises.readdir(fullPath);

  let detailedFiles = names.filter(name => !name.startsWith('.')).map(file => {
    // lstat does not follow symlinks, so this cannot leave the user's folder.
    const stat = fs.lstatSync(path.join(fullPath, file));
    return {
      name: file,
      path: relativePath,
      escapedPath,
      details: {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        birthtime: stat.birthtimeMs
      }
    };
  });

  const numerOfPages = Math.ceil(detailedFiles.length / itemsPerPage);

  if (numerOfPages >= 2)
    detailedFiles = detailedFiles.slice((page - 1) * itemsPerPage, (page - 1) * itemsPerPage + itemsPerPage);

  res.render('files', {
    title: 'Files viewer',
    path: relativePath,
    files: detailedFiles,
    parentDir,
    username,
    page,
    itemsPerPage,
    numerOfPages
  });
});


router.post('/upload', async function (req, res) {
  const validationResult = fsUtils.validateUserForPath(req.body.path, res.locals.user);
  const absolutePath = validationResult.path;

  if (validationResult.readOnly) {
    throw createError(403, "You don't have permissions to edit this shared folder.");
  }

  if (!req.files || !req.files.sampleFile) {
    throw createError(400, 'No files were uploaded.');
  }

  const filesArray = Array.isArray(req.files.sampleFile) ? req.files.sampleFile : [req.files.sampleFile];

  // Validate every name before writing anything.
  const targets = filesArray.map(file => ({ file, name: fsUtils.safeName(path.basename(file.name)) }));

  for (const { file, name } of targets) {
    const fullPath = path.join(absolutePath, name);
    console.log('Uploading file to', fullPath);
    await file.mv(fullPath);
  }

  res.redirect(filesUrl(validationResult.relativePath));
});


function resolveFile(req, res) {
  const relativePath = path.posix.join(fsUtils.normalizeRelative(req.query.path), fsUtils.safeName(req.params.fileName));
  return fsUtils.validateUserForPath(relativePath, res.locals.user).path;
}

router.get('/get/:fileName', function (req, res) {
  res.sendFile(resolveFile(req, res));
});

router.get('/get/preview/:fileName', async function (req, res) {
  const filePath = resolveFile(req, res);

  // TODO make this as an option in GUI
  try {
    const buff = await sharp(filePath).resize(500).rotate().toBuffer();
    res.end(buff);
  } catch (error) {
    res.status(415).json({ error: 'Preview not available' });
  }
});

router.post('/delete', function (req, res) {
  const parent = fsUtils.normalizeRelative(req.body.path);
  const selectedItems = Object.keys(req.body).filter(item => item !== 'path');

  for (const item of selectedItems) {
    const validationResult = fsUtils.validateUserForPath(path.posix.join(parent, fsUtils.safeName(item)), res.locals.user);
    const filePath = validationResult.path;

    if (validationResult.readOnly) {
      throw createError(403, "You don't have permissions to edit this shared folder.");
    }

    console.log('removing file at path', filePath);

    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      fs.rmdirSync(filePath);
    } else if (stat.isFile()) {
      fs.unlinkSync(filePath);
    } else {
      throw createError(400, `Could not delete ${item}. Unknown target type!`);
    }
  }

  res.redirect(filesUrl(parent));
});

router.get('/shared', function (req, res) {
  const user = res.locals.user;

  const sharedFolders = (user.shared || []).map(item => ({
    path: item.path,
    owner: item.owner,
    details: {
      isFile: false,
      isDirectory: true,
    }
  }));

  res.render('shared', {
    title: 'Shared folders',
    folders: sharedFolders,
    username: user.username
  });
});

module.exports = router;
