var request = require('request');
var async = require('async');
var personFetcher = require('./personFetcher');
var pivotalApi = require('./pivotalApi');
var utils = require('./utils.js');

var findBusinessDaysInRange = require('find-business-days-in-range').calc

module.exports = storyFetcher;

function storyFetcher () {};

var internals = {};
const TRANSITION_ERROR_CODE = -99;

internals.getStoryViewModel = function (storyDetail, membershipInfo, transitions) {
    var viewModels = storyDetail.map(function (story) {
        var workers = story.owner_ids.map(function (worker_id) {
            return personFetcher.mapPersonFromId(worker_id, membershipInfo);
        });
        var signOffBy = personFetcher.mapPersonFromId(story.requested_by_id, membershipInfo);
        var daysInProgress = internals.calculateDaysInProgress(story.id, story.current_state, transitions);
        return {
            id: story.id,
            name: story.name,
            signOffBy: signOffBy,
            workers: workers,
            daysInProgress: daysInProgress
        }
    });

    return viewModels;
}

internals.getStoriesByStatus = function (res, callback, projectId, status) {
    //Get the list of stories
    var options = {
        url: 'https://www.pivotaltracker.com/services/v5/projects/' + projectId + '/stories?date_format=millis&with_story_type=feature&with_state=' + status,
        headers: {
            'X-TrackerToken': res.app.get('pivotalApiKey')
        }
    };

    request(options, function getStories (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, JSON.parse(body));
        } else {
            callback("Couldn't get stories thanks to this: " + response.statusCode, null);
        }
    });
}

/**
 * Get all of the stories in all projects
 * @param res
 * @param projects
 * @param callback
 */
storyFetcher.getAllStories = function (res, projects, callback) {

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?fields=url,current_state,project_id,estimate,name,description,labels(name)&date_format=millis&with_story_type=feature');
    pivotalApi.aggregateQuery(res, query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = [];
        for (var result in results) {
            stories = stories.concat(results[ result ])
        }

        callback(null, stories);
    });

};

/**
 * Get a specific story
 * @param res
 * @param projectId
 * @param storyId
 * @param callback
 */
storyFetcher.getStory = function (res, projectId, storyId, callback) {

    var options = {
        url: 'https://www.pivotaltracker.com/services/v5/projects/' + projectId + '/stories/' + storyId,
        headers: {
            'X-TrackerToken': res.app.get('pivotalApiKey')
        }
    };

    request(options, function getStories (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, JSON.parse(body));
        } else {
            callback("Couldn't get story thanks to this crap: " + response.statusCode, null);
        }
    });

};

/**
 * Get the stories with the specified status for all of the default projects
 * @param res
 * @param status The Status to search for
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesWithStatus = function (res, status, projects, callback) {

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?date_format=millis&with_state=' + encodeURIComponent(status) + '&with_story_type=feature&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res, query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = [];
        for (var result in results) {
            stories = stories.concat(results[ result ])
        }

        callback(null, stories);
    });
};

/**
 * Get the tasks for a specific story
 * @param res
 * @param stgory The ID of the story
 * @param Project the story is on
 * @param callback Function to call with the result
 */
storyFetcher.getTasksForStory = function (res, projectId, storyId, callback) {

    //Get the list of stories
    var options = {
        url: 'https://www.pivotaltracker.com/services/v5/projects/' + projectId + '/stories/' + storyId + '/tasks',
        headers: {
            'X-TrackerToken': res.app.get('pivotalApiKey')
        }
    };

    request(options, function getStories (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(null, JSON.parse(body));
        } else {
            callback("Couldn't get stories thanks to this: " + response.statusCode, null);
        }
    });
};

/**
 * Get the stories with the specified label for all of the default projects
 * @param res
 * @param label The label to search for
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesWithLabel = function (res, label, projects, callback) {

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?date_format=millis&with_label=' + encodeURIComponent(label) + '&with_story_type=feature&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res, query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = [];
        for (var result in results) {
            stories = stories.concat(results[ result ])
        }

        callback(null, stories);
    });
};

/**
 * Get all of the bugs
 * @param res
 * @param label The label to search for
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllBugs = function (res, projects, callback) {

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?date_format=millis&with_story_type=bug&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res, query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = [];
        for (var result in results) {
            stories = stories.concat(results[ result ])
        }

        callback(null, stories);
    });
};

storyFetcher.getStorySummary = function (res) {
    async.parallel([
            function (callback) {
                internals.getStoriesByStatus(res, callback, "started");
            },
            function (callback) {
                personFetcher.getMembers(res, callback);
            },
            function (callback) {
                internals.getStoriesByStatus(res, callback, "finished");
            },
            function (callback) {
                internals.getStoriesByStatus(res, callback, "delivered");
            },
            function (callback) {
                internals.getStoriesByStatus(res, callback, "rejected");
            },
            function (callback) {
                internals.getStoriesByStatus(res, callback, "unscheduled");
            }
        ],
        // Combine the results of the things above
        function (err, results) {
            if (err) {
                res.render('damn', {
                    message: '┬──┬◡ﾉ(° -°ﾉ)',
                    status: err,
                    reason: "(╯°□°）╯︵ ┻━┻"
                });
            } else {
                var startedStories = internals.getStoryViewModel(results[ 0 ], results[ 1 ], results[ 5 ]);
                var finishedStories = internals.getStoryViewModel(results[ 2 ], results[ 1 ], results[ 5 ]);
                var deliveredStories = internals.getStoryViewModel(results[ 3 ], results[ 1 ], results[ 5 ]);
                var rejectedStories = internals.getStoryViewModel(results[ 4 ], results[ 1 ], results[ 5 ]);
                var reviewSlotsFull = res.app.get('reviewSlotsLimit') <= finishedStories.length;
                var approveSlotsFull = res.app.get('signOffSlotsLimit') <= deliveredStories.length;

                res.render('index', {
                    projectId: res.app.get('pivotalProjectId'),
                    story: startedStories,
                    finishedStory: finishedStories,
                    deliveredStory: deliveredStories,
                    rejectedStory: rejectedStories,
                    reviewSlotsFull: reviewSlotsFull,
                    approveSlotsFull: approveSlotsFull
                });
            }
        });
}

storyFetcher.milestoneSummary = function (milestoneData) {
    var result = {
        numStories: 0,
        totalPoints: 0,
        title: 0,
        started: 0,
        startedPoints: 0,
        finished: 0,
        finishedPoints: 0,
        unstarted: 0,
        unstartedPoints: 0,
        unscheduled: 0,
        unscheduledPoints: 0,
        notEstimated: 0
    }

    for (var m = 0; m < milestoneData.length; m++) {
        for (var i = 0; i < milestoneData[ m ].stories.length; i++) {
            var story = milestoneData[ m ].stories[ i ];
            var estimate = utils.validInteger(story.estimate);

            if( estimate===0) {
                result.notEstimated++;
            }
            result.numStories += 1;
            result.totalPoints += estimate;

            if (story.current_state === 'started') {
                result.started++;
                result.startedPoints += estimate;
            } else if (story.current_state === 'finished') {
                result.finished++;
                result.finishedPoints += story.estimate;
            } else if (story.current_state === 'delivered') {
                result.finished++;
                result.finishedPoints += estimate;
            } else if (story.current_state === 'accepted') {
                result.finished++;
                result.finishedPoints += estimate;
            } else if (story.current_state === 'unstarted') {
                result.unstarted++;
                result.unstartedPoints += estimate;
            } else if (story.current_state === 'unscheduled') {
                result.unscheduled++;
                result.unscheduledPoints += estimate;
            }
        }
    }

    result.storiesNotStarted = result.unscheduled + result.unstarted;
    result.pointsNotStarted = result.unscheduledPoints + result.unstartedPoints;

    result.percentageFinished = (result.numStories == 0 || result.finished == 0 ?
        0 : (100 / (result.numStories / result.finished)));
    result.percentageStarted = (result.numStories == 0 || result.started == 0 ?
        0 : (100 / (result.numStories / result.started)));
    result.percentageNotStarted = (result.numStories == 0 || result.storiesNotStarted == 0 ?
        0 : (100 / (result.numStories / result.storiesNotStarted)));

    result.percentagePointsFinished = (result.totalPoints == 0 || result.finishedPoints == 0 ?
        0 : (100 / (result.totalPoints / result.finishedPoints)));
    result.percentagePointsStarted = (result.totalPoints == 0 || result.startedPoints == 0 ?
        0 : (100 / (result.totalPoints / result.startedPoints)));
    result.percentagePointsNotStarted = (result.totalPoints == 0 || result.pointsNotStarted == 0 ?
        0 : (100 / (result.totalPoints / result.pointsNotStarted)));

    return result;
};
