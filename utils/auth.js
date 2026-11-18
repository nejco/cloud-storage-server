const fsUtils = require('./FsUtils');

// Reads the JWT from the cookie and stores the decoded token on res.locals.user.
// Returns null when there is no valid token.
function readUser(req) {
    const cookie = req.cookies && req.cookies.jwtToken;
    if (!cookie) {
        return null;
    }
    try {
        const token = JSON.parse(cookie).token;
        return fsUtils.decodeToken(token);
    } catch (e) {
        return null;
    }
}
module.exports.readUser = readUser;

// Router middleware: shows the login page unless a valid token is present.
module.exports.requireAuth = function (req, res, next) {
    const user = readUser(req);
    if (!user) {
        res.clearCookie('jwtToken');
        return res.status(401).render('index', { title: 'Log in', errorMessage: null });
    }
    res.locals.user = user;
    next();
};
