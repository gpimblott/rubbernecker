var express = require('express');
var exphbs = require('express-handlebars');
var Handlebars = require('handlebars');
var hdf = require('handlebars-dateformat');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var utils = require('./lib/utils.js')

var routes = require('./routes/index');
var labels = require('./routes/labels');
var projects = require('./routes/projects');
var epics = require('./routes/epics');
var stories = require('./routes/stories');
var roadmap = require('./routes/roadmap');
var kanban = require('./routes/kanban');
var search = require('./routes/search');
var story = require('./routes/story');
var release = require('./routes/releases');

var bhsUtils = require('./lib/handlebarsHelpers');

var projectFetcher = require('./lib/projectFetcher');

var app = express();

/**
 * Set API Key based on Environment variable
 **/
var pivotalApiKey = process.env.PIVOTAL_API_KEY || 'You need to set a key';
app.set('pivotalApiKey', pivotalApiKey);

// Setup the Google Analytics ID if defined
app.locals.google_id = process.env.GOOGLE_ID || undefined;
console.log("GA ID:" + app.locals.google_id);

var defaultLabels = process.env.DEFAULT_LABELS || "";
app.set('defaultLabels', defaultLabels.split(','));

var defaultProjects = process.env.DEFAULT_PROJECTS || "";
app.set('defaultProjects', defaultProjects.split(','));

var milestoneLabels = process.env.MILESTONE_LABELS || "";
app.set('milestoneLabels', milestoneLabels.split(','));

var hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        dateFormat: hdf,
    },
    defaultLayout: 'main',
    extname: '.hbs'
});

app.engine('hbs', hbs.engine);

app.set('view engine', 'hbs');

var useAuth = process.env.USE_AUTH || 'false'
if (useAuth === 'true') {
    var username = process.env.USERNAME
    var password = process.env.PASSWORD
    app.use(utils.basicAuth(username, password))
}

// view engine setup
app.set('layoutsDir', path.join(__dirname, 'views/layouts'));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

projectFetcher.buildProjectCache(app.get('pivotalApiKey'), app.get('defaultProjects'));
projectFetcher.buildReleaseCache(app.get('pivotalApiKey'), app.get('defaultProjects'));

app.use(function (req, res, next) {
    res.locals.projects = projectFetcher.getProjectSummary();
    res.locals.releases = projectFetcher.getProjectReleases()
    res.locals.defaultLabels = app.get('defaultLabels');
    next();
});

app.use('/', routes);
app.use('/labels', labels);
app.use('/projects', projects);
app.use('/epics', epics);
app.use('/stories', stories);
app.use('/roadmap', roadmap);
app.use('/kanban', kanban);
app.use('/search', search);
app.use('/story', story);
app.use('/release', release);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;