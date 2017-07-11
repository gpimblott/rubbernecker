var debug = require('debug')('rubbernecker:stories');
var express = require('express');
var router = express.Router();
var storyFetcher = require('../lib/storyFetcher');
var utils = require('../lib/utils');

router.get('/', function (req, res, next) {

  storyFetcher.getAllStories(res, res.app.get('defaultProjects'), function (error, stories) {

    if (error) {
      res.render('damn', {
        message: '┬──┬◡ﾉ(° -°ﾉ)',
        status: error,
        reason: "(╯°□°）╯︵ ┻━┻"
      });

    } else {
      utils.renderStories(res, stories, "All Stories");
    }
  })

});

router.get("/bugs", function (req, res, next) {

  storyFetcher.getAllBugs(res, res.app.get('defaultProjects'), function (error, stories) {

    if (error) {

      res.render('damn', {
        message: '┬──┬◡ﾉ(° -°ﾉ)',
        status: error,
        reason: "(╯°□°）╯︵ ┻━┻"
      });

    } else {
      utils.renderStories(res, stories, "Bugs");
    }
  });
});

router.get("/notassigned", function (req, res, next) {
    const milestoneNames = res.app.get('milestoneLabels');

    storyFetcher.getAllStoriesWithoutLabels(res, milestoneNames , res.app.get('defaultProjects'), function (error, stories) {

        if (error) {

            res.render('damn', {
                message: '┬──┬◡ﾉ(° -°ﾉ)',
                status: error,
                reason: "(╯°□°）╯︵ ┻━┻"
            });

        } else {
            utils.renderStories(res, stories, "Bugs");
        }
    });
});

router.get('/:status/:label', function (req, res, next) {
    const status = req.params[ "status" ];
    const label = req.params[ "label" ];

    debug("searching for %s , %s" , status , label);

    storyFetcher.getAllStoriesWithStatusAndLabel(res, status, label, res.app.get('defaultProjects'), function (error, stories) {
        if (error) {
            res.render('damn', {
                message: '┬──┬◡ﾉ(° -°ﾉ)',
                status: error,
                reason: "(╯°□°）╯︵ ┻━┻"
            });

        } else {
            utils.renderStories(res, stories, "Stories with status '" + status+"' and label '" + label + "'");
        }
    });
});

router.get('/:status', function (req, res, next) {
  const status = req.params[ "status" ];

  storyFetcher.getAllStoriesWithStatus(res, status, res.app.get('defaultProjects'), function (error, stories) {
    if (error) {
      res.render('damn', {
        message: '┬──┬◡ﾉ(° -°ﾉ)',
        status: error,
        reason: "(╯°□°）╯︵ ┻━┻"
      });

    } else {
      utils.renderStories(res, stories, "Stories with status '" + status+"'");
    }
  });
});


module.exports = router;
