var debug = require('debug')('rubbernecker:storyFetcher');
var request = require('request');
var async = require('async');
var personFetcher = require('./personFetcher');
var pivotalApi = require('./pivotalApi');
var utils = require('./utils.js');


module.exports = storyFetcher;

function storyFetcher () {};

var internals = {};


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
 * Common method to retrieve stories with an optional status or label filter
 * @param res
 * @param callback
 * @param projects
 * @param status
 * @param label
 */
internals.getStoriesWithStatusOrLabel = function (res, callback, projects, status, label) {

    var queryStr = '/stories?date_format=millis&limit=500&envelope=true';

    if (status == null && label == null) {
        debug("Retrieving all stories");
    }

    if (null !== status) {
        queryStr += '&with_state=' + encodeURIComponent(status);
    }

    if (null !== label) {
        queryStr += '&with_label=' + encodeURIComponent(label);
    }

    queryStr += '&with_story_type=feature&fields=url,project_id,current_state,estimate,name,description,labels(name)';

    var query = pivotalApi.aggregatorHelperAllProjects(projects, queryStr);
    pivotalApi.aggregateQuery(res.app.get('pivotalApiKey'), query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = internals.extractStoriesFromResults(results);
        debug("Retrieved %s stories with status:%s label:%s", stories.length, status , label);

        callback(null, stories);
    });
}

/**
 * Build the required story structure to display on a page
 * @param results
 * @returns {Array}
 */
internals.extractStoriesFromResults = function (results) {
    var stories = [];
    for (var key in results) {

        var pagination = results[ key ].pagination;
        var data = results[ key ].data;

        if (pagination.total > pagination.offset + pagination.returned) {
            debug("There is missing data for [%s]", key);
            debug(pagination);
        }

        stories = stories.concat(data)
    }

    return stories;
}

/**
 * Get all of the stories in all projects
 * @param res
 * @param projects
 * @param callback
 */
storyFetcher.getAllStories = function (res, projects, callback) {

    internals.getStoriesWithStatusOrLabel(res, callback, projects, null , null);
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

    internals.getStoriesWithStatusOrLabel(res, callback, projects, status, null);
};

/**
 * Get the stories with the specified label for all of the default projects
 * @param res
 * @param label The label to search for
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesWithLabel = function (res, label, projects, callback) {

    internals.getStoriesWithStatusOrLabel(res, callback, projects, null, label);
};

/**
 * Get the stories with the specified label for all of the default projects
 * @param res
 * @param status The Status to search for
 * @param label The label to search for
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesWithStatusAndLabel = function (res,status, label, projects, callback) {

    internals.getStoriesWithStatusOrLabel(res, callback, projects, status, label);
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
 * Get the stories that have been updated since the specified date
 * @param res
 * @param dateSince The date to search from
 * @param projects of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesUpdatedSince = function (res, dateSince, projects, callback) {

    debug("Updated since %s", dateSince);

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?limit=500&envelope=true&updated_after=' + dateSince + '&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res.app.get('pivotalApiKey'), query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = internals.extractStoriesFromResults(results);
        debug("Retrieved %s stories updated since %s", stories.length, dateSince);

        callback(null, stories);
    });
};

/**
 * Get the stories that have been created since the specified date
 * @param res
 * @param dateSince The date to search from
 * @param projects of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesCreatedSince = function (res, dateSince, projects, callback) {

    debug("Created since %s", dateSince);

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?limit=500&envelope=true&created_after=' + dateSince + '&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res.app.get('pivotalApiKey'), query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = internals.extractStoriesFromResults(results);
        debug("Retrieved %s stories created since %s", stories.length, dateSince);

        callback(null, stories);
    });
};

/**
 * Get the stories with the without the specified label for all of the default projects
 * @param res
 * @param labes The labels to exclude from the search
 * @param array of project ids we are interested in
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesWithoutLabels = function (res, labels, projects, callback) {

    // -label:"mvp nov17" -label:"mvp april 18" -label:"post april 18"
    var filter = '';
    labels.forEach(function (item) {
        filter += ' -label:"' + item + '"';
    })

    filter += ' type:feature';

    debug("Filter %s", filter);

    var query = pivotalApi.aggregatorHelperAllProjects(projects,
        '/stories?limit=500&envelope=true&filter=' + encodeURIComponent(filter) + '&fields=url,project_id,current_state,estimate,name,description,labels(name)');
    pivotalApi.aggregateQuery(res.app.get('pivotalApiKey'), query, function (error, results) {

        if (error) {
            callback(error, null);
            return;
        }

        var stories = internals.extractStoriesFromResults(results);
        debug("Retrieved %s stories with label %s", stories.length, labels);

        callback(null, stories);
    });
};

/**
 * Get the stories for the specified release
 * @param res
 * @param projectid The ID of the project
 * @param releaseid The ID of the release
 * @param callback Function to call with the result
 */
storyFetcher.getAllStoriesForRelease = function (res, projectid, releaseid, callback) {

    var options = {
        url: 'https://www.pivotaltracker.com/services/v5/projects/' + projectid + '/releases/' + releaseid + '/stories' +
            '?date_format=millis',
        headers: {
            'X-TrackerToken': res.app.get('pivotalApiKey')
        }
    };

    request(options, function getStories (error, response, results) {
        if (!error && response.statusCode == 200) {

            callback(null, JSON.parse(results));
        } else {
            callback("Couldn't get stories thanks to this: " + response.statusCode, null);
        }
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
    pivotalApi.aggregateQuery(res.app.get('pivotalApiKey'), query, function (error, results) {

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

storyFetcher.milestoneSummary = function (stories) {
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
        notEstimated: 0,
        notEstimatedPercentage: 0
    }

    for (var m = 0; m < stories.length; m++) {
        var story = stories[ m ];
        var estimate = utils.validInteger(story.estimate);

        if (!utils.isValidInteger(story.estimate)) {
            result.notEstimated++;
        } else {
            result.totalPoints += estimate;
        }

        result.numStories += 1;

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
        } else if (story.current_state === 'planned') {
            result.unstarted++;
            result.unstartedPoints += estimate;
        }
        else {
            debug('Unknown story state : %s', story.current_state);
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

    result.notEstimatedPercentage = (result.numStories == 0 || result.notEstimated == 0 ?
        0 : (100 / (result.numStories / result.notEstimated)));

    return result;
};
