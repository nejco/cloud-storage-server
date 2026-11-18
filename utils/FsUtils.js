const fs = require('fs');
const path = require('path');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const config = require('../conf/config.json');

const filesRoot = path.resolve(config.filesRoot);
module.exports.filesRoot = filesRoot;

// Normalises a user-supplied relative path ("/owner/dir/...") to a canonical
// POSIX form without any "." or ".." segments.
function normalizeRelative(relativePath) {
    if (typeof relativePath !== 'string' || relativePath.includes('\0')) {
        throw createError(400, 'Invalid path');
    }
    return path.posix.normalize('/' + relativePath).replace(/\/+$/, '') || '/';
}
module.exports.normalizeRelative = normalizeRelative;

function isInside(child, parent) {
    return child === parent || child.startsWith(parent + path.sep);
}

// Resolves a relative path to an absolute path inside the owner's folder.
// Throws 403 if it escapes the folder (including via symlinks) and 404 if it
// does not exist (unless allowMissing is set, used for new folders).
function stripPath(relativePath, owner, { allowMissing = false } = {}) {
    const rel = normalizeRelative(relativePath);
    const allowedUserPath = path.join(filesRoot, owner);
    const absolutePath = path.join(filesRoot, rel);

    if (!owner || owner.includes('/') || owner.includes('..') || !isInside(absolutePath, allowedUserPath)) {
        throw createError(403, 'Access denied');
    }

    let realPath;
    try {
        realPath = fs.realpathSync(absolutePath);
    } catch (e) {
        if (allowMissing && e.code === 'ENOENT') {
            return absolutePath;
        }
        throw createError(404, 'Not found');
    }

    if (!isInside(realPath, fs.realpathSync(allowedUserPath))) {
        throw createError(403, 'Access denied');
    }
    return absolutePath;
}
module.exports.stripPath = stripPath;

module.exports.decodeToken = (jwtToken) => jwt.verify(jwtToken, config.jwt.secret);

// Works out who owns relativePath for the logged-in user (own folder or a
// folder shared with them) and returns the absolute path plus permissions.
module.exports.validateUserForPath = (relativePath, decoded, options) => {
    if (!decoded) {
        throw createError(401, 'You are not logged in!');
    }
    const rel = normalizeRelative(relativePath);

    const shared = (decoded.shared || []).filter(item => rel === item.path || rel.startsWith(item.path + '/'));

    if (shared.length > 1) {
        throw createError(500, 'Invalid sharing configuration, found duplicate!');
    }

    if (shared.length === 1) {
        return {
            path: stripPath(rel, shared[0].owner, options),
            relativePath: rel,
            username: decoded.username,
            readOnly: shared[0].readOnly
        };
    }
    return {
        path: stripPath(rel, decoded.username, options),
        relativePath: rel,
        username: decoded.username,
        readOnly: false
    };
};

// A single path segment chosen by the user (file or folder name).
module.exports.safeName = (name) => {
    if (typeof name !== 'string') {
        throw createError(400, 'Invalid name');
    }
    const trimmed = name.trim();
    if (!trimmed || trimmed === '.' || trimmed === '..' || /[\/\\\0]/.test(trimmed)) {
        throw createError(400, `Invalid name ${name}`);
    }
    return trimmed;
};
