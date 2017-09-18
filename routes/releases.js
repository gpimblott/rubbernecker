var debug = require('debug')('rubbernecker:stories');
var express = require('express');
var router = express.Router();
var storyFetcher = require('../lib/storyFetcher');
var projectFetcher = require('../lib/projectFetcher');
var utils = require('../lib/utils');


router.get('/:projectid/:releaseid/', function (req, res, next) {
    const projectid = req.params[ "projectid" ];
    const releaseid = req.params[ "releaseid" ];

    storyFetcher.getAllStoriesForRelease(res, projectid, releaseid, function (error, stories) {
        if (error) {
            res.render('Oh dear', {
                message: 'Something went wrong getting release',
                status: error,
                reason: "Unknown"
            });

        } else {
            utils.renderStories(res, stories, projectFetcher.lookupRelease(releaseid));
        }
    });
});

module.exports = router;