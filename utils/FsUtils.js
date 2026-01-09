const fs = require('fs');
const config = require('../conf/config.json');
const jwt = require('jsonwebtoken');
const path = require('path');

module.exports.filesRoot = config.filesRoot;

function stripPath(relativePath, username) {

    const allowedUserPath = path.join(config.filesRoot, username);
    const absolutePath = path.join(config.filesRoot, relativePath);
    const realPath = fs.realpathSync(absolutePath);

    if(absolutePath.startsWith(allowedUserPath)) {
        console.log(`path ${absolutePath} is valid for ${username}`);
        return absolutePath;
    } else {
        throw new Error(`Resolved path ${realPath} in invalid!`);
    }

}
module.exports.stripPath = stripPath;

module.exports.validateUserForPath = (relativePath, jwtToken) => {

    if(!jwtToken) {
        throw new Error('You are not logged in!');
    }
    // validate token
    const decoded = jwt.verify(jwtToken, config.jwt.secret);

    const shared = decoded.shared.filter(item => relativePath.startsWith(item.path));

    if(shared.length > 1) {
        throw new Error("Invalid sharing configuration, found duplicate!")
    }

    if(shared.length === 1) {
        return {
            path: stripPath(relativePath, shared[0].owner),
            username: decoded.username,
            readOnly: shared[0].readOnly
        }
    } else {
        return {
            path: stripPath(relativePath, decoded.username),
            username: decoded.username,
            readOnly: false
        }
    }


};

module.exports.decodeToken = (jwtToken) => {
    const decoded = jwt.verify(jwtToken, config.jwt.secret);
    return decoded;
};


