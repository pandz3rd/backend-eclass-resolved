const express = require('express');
const glob = require('glob');

// const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compress = require('compression');
const methodOverride = require('method-override');
// const exphbs  = require('express-handlebars');
const session = require('express-session');
const cors = require('cors');

module.exports = (app, config) => {
  const env = process.env.NODE_ENV || 'development';
  app.locals.ENV = env;
  app.locals.ENV_DEVELOPMENT = env == 'development';
  
  // app.engine('handlebars', exphbs({
  //   layoutsDir: config.root + '/app/views/layouts/',
  //   defaultLayout: 'main',
  //   partialsDir: [config.root + '/app/views/partials/']
  // }));
  // app.set('views', config.root + '/app/views');
  // app.set('view engine', 'html');

  // app.use(favicon(config.root + '/public/img/favicon.ico'));
  app.use(logger('dev'));
  app.use(session({
    secret: 'secretkey',
    resave: true,
    saveUninitialized: true
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(cookieParser());
  app.use(compress());
  // app.use(express.static(config.root + '/public'));
  app.use(methodOverride());

  var controllers = glob.sync(config.root + '/app/controllers/*.js');
  controllers.forEach((controller) => {
    require(controller)(app);
  });
  
  app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
      res.status(err.status || 500);
      res.json({status:"INTERNAL SERVER ERROR",code:500,message:err.message})
    });
  }

  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({status:"INTERNAL SERVER ERROR",code:500,message:err.message})
    // res.render('error', {
    //   message: err.message,
    //   error: {},
    //   title: 'error'
    // });
  });

  var sess;
  app.get('/',function(req,res){
    sess=req.session;
    /*
    * Here we have assign the 'session' to 'sess'.
    * Now we can create any number of session variable we want.
    */
    sess.email;
    sess.username;
  });

  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Request-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE');
    next();
  });

  return app;
};
