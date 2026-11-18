const createError = require('http-errors');
const express = require('express');
const os = require('os');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const filesRouter = require('./routes/files');
const directoryRouter = require('./routes/directory');
const settingsRouter = require('./routes/settings');

const app = express();

app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Stream uploads to temp files instead of holding them in memory.
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(os.tmpdir(), 'css-uploads'),
  abortOnLimit: true,
}));

app.use(logger(app.get('env') === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/files', filesRouter);
app.use('/directory', directoryRouter);
app.use('/settings', settingsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  // Only show details for client errors, and the stack only in development.
  res.locals.message = err.expose ? err.message : 'Something went wrong.';
  res.locals.error = req.app.get('env') === 'development' ? err : { status };

  res.status(status);
  res.render('error');
});

module.exports = app;
