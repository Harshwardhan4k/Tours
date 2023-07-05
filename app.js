const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); // middle ware to set security HTTP headers
const mongoSanitize = require('express-mongo-sanitize'); // middle ware to sanitize the data against NoSQL query injection
const xss = require('xss-clean'); // middle ware to sanitize the data against XSS
const hpp = require('hpp'); // middle ware to prevent parameter pollution
const cookieParser = require('cookie-parser');

const AppError = require('./utilities/appError');
const globalErrorHandler = require('./controllers/errorControler');
const tourRouter = require('./routes/toursRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1->GLOBAL MIDDLEWARE

app.use(express.static(`${__dirname}/public`)); // middle ware to serve static files
// set security HTTP headers
// app.use(helmet());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev')); // middle ware to log the request

// limit the request from a single IP  address
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1hr
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter); // middle ware to limit the request from a single IP  address
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // middle ware to parse the cookie

// body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //middle ware to parse the body of the request

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // middle ware to sanitize the data against NoSQL query injection

// Data sanitization against XSS
app.use(xss()); // middle ware to sanitize the data against XSS

// prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // middle ware to prevent parameter pollution

//serve static files

// app.use((req, res, next) => {
//   console.log('Hello form the middle ware👋');
//   next();
// });

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3-> ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
// app.use((err, req, res, next) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || 'error';
//   console.log(err);
//   res.status(err.statusCode).json({
//     status: err.status,
//     message: err.message,
//   });
// });

app.use(globalErrorHandler);

module.exports = app;
