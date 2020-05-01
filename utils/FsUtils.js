const fs = require('fs');
const config = require('../conf/config.json');
const jwt = require('jsonwebtoken');
const path = require('path');

module.exports.filesRoot = config.filesRoot;

function stripPath(relativePath, username) {

    const allowedUserPath = path.join(config.filesRoot, username);
    const absolutePath = path.join(config.filesRoot, username, relativePath);
    const realPath = fs.realpathSync(absolutePath);

    if(absolutePath.startsWith(allowedUserPath)) {
        console.log(`path ${absolutePath} is valid for ${username}`);
        return absolutePath;
    } else {
        throw new Error(`Resolved path ${realPath} in invalid!`);
    }

}

module.exports.validateUserForPath = (relativePath, jwtToken) => {

    if(!jwtToken) {
        throw new Error('You are not logged in!');
    }
    // validate token
    const decoded = jwt.verify(jwtToken, config.jwt.secret);
    return {
        path: stripPath(relativePath, decoded.username),
        username: decoded.username
    }

};


