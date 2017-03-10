'use strict';

var Handlebars = require('handlebars');
var utils = require('./utils.js');
var projectFetcher = require('./projectFetcher');

/**
 * Helper functions for Handlebars
 */

Handlebars.registerHelper("story_summary", function (stories) {
  var started = 0;
  var unstarted = 0;
  var unscheduled = 0;
  var finished = 0;
  for (var i = 0; i < stories.length; i++) {
    var story = stories[ i ];
    if (story.current_state === 'started') {
      started++;
    } else if (story.current_state === 'finished') {
      finished++;
    } else if (story.current_state === 'delivered') {
      finished++;
    } else if (story.current_state === 'accepted') {
      finished++;
    } else if (story.current_state === 'unstarted') {
      unstarted++;
    } else if (story.current_state === 'unscheduled') {
      unscheduled++;
    }
  }

  var text = "Started: " + started + " Finished:" + finished + " Not Started:" + unstarted + " Unscheduled:" + unscheduled;
  return text;
});

Handlebars.registerHelper("milestone_summary", function (milestone) {
  var started = 0;
  var unstarted = 0;
  var unscheduled = 0;
  var finished = 0;
  var startedPoints = 0;
  var unstartedPoints = 0;
  var unscheduledPoints = 0;
  var finishedPoints = 0;
  for (var m = 0; m < milestone.data.length; m++) {
    for (var i = 0; i < milestone.data[ m ].stories.length; i++) {
      var story = milestone.data[ m ].stories[ i ];
      var estimate = utils.validInteger(story.estimate);
      if (story.current_state === 'started') {
        started++;
        startedPoints += estimate;
      } else if (story.current_state === 'finished') {
        finished++;
        finishedPoints += story.estimate;
      } else if (story.current_state === 'delivered') {
        finished++;
        finishedPoints += estimate;
      } else if (story.current_state === 'accepted') {
        finished++;
        finishedPoints += estimate;
      } else if (story.current_state === 'unstarted') {
        unstarted++;
        unstartedPoints += estimate;
      } else if (story.current_state === 'unscheduled') {
        unscheduled++;
        unscheduledPoints += estimate;
      }
    }
  }

  var text = "<tr>"
    + "<td>Started</td><td>" + started + "</td><td>" + startedPoints + "</td>"
    + "</tr><tr>"
    + "<td>Not Started</td><td>" + unstarted + "</td><td>" + unstartedPoints + "</td>"
    + "</tr><tr>"
    + "<td>Finished</td><td>" + finished + "</td><td>" + finishedPoints + "</td>"
    + "</tr><tr>"
    + "<td>Unscheduled</td><td>" + unscheduled + "</td><td>" + unscheduledPoints + "</td>"
    + "</tr><tr bgcolor='#fff8dc'>"
    + "<td></td><td>" + (started + unstarted + finished + unscheduled) + "</td>"
    + "<td>" + (startedPoints + unstartedPoints + finishedPoints + unscheduledPoints) + "</td>"
    + "</tr>";

  return text;
});

Handlebars.registerHelper("is_started", function (stories, options) {
  for (var i = 0; i < stories.length; i++) {
    if (stories[ i ].current_state === 'started') {
      return options.fn(this);
    }
  }
  return options.inverse(this);
});

Handlebars.registerHelper("is_finished", function (stories, options) {
  for (var i = 0; i < stories.length; i++) {
    if (stories[ i ].current_state != 'finished' && stories[ i ].current_state != 'accepted' && stories[ i ].current_state != 'delivered') {
      return options.inverse(this);
    }
  }
  return options.fn(this);
});

Handlebars.registerHelper("calculatePoints", function (stories) {
  var points = 0;
  if (stories === undefined) {
    return 0;
  }

  stories.forEach(function (story) {
    points += utils.validInteger(story.estimate);
  });

  return points;
});

Handlebars.registerHelper("projectid2name", function (id) {
  return new Handlebars.SafeString(projectFetcher.lookupProject(id));
});

Handlebars.registerHelper("truncate", function (str, len) {
  if (str && str.length > len && str.length > 0) {
    var new_str = str + " ";
    new_str = str.substr(0, len);
    new_str = str.substr(0, new_str.lastIndexOf(" "));
    new_str = (new_str.length > 0) ? new_str : str.substr(0, len);

    return new Handlebars.SafeString(new_str + '...');
  }
  return str;
});

Handlebars.registerHelper("encode", function (context, str) {
  var uri = context || str;
  return new Handlebars.SafeString(encodeURIComponent(uri));
});

Handlebars.registerHelper("nl2br", function (text, isXhtml) {
  var breakTag = (isXhtml || typeof isXhtml === 'undefined') ? '<br />' : '<br>';
  return (text + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
});