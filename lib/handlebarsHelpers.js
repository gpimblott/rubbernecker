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

  var notStarted = unscheduled + unstarted;

  var percentageFinished = (stories.length == 0 || finished == 0 ? 0 : (100 / (stories.length / finished))).toFixed(0);
  var percentageStarted = (stories.length == 0 || started == 0 ? 0 : (100 / (stories.length / started))).toFixed(0);
  var percentageNotStarted = (stories.length == 0 || notStarted == 0 ? 0 : (100 / (stories.length / notStarted))).toFixed(0);

  var text = '<div class="progress">'
    + '<div class="progress-bar progress-bar-danger" role="progressbar" aria-valuenow="70"'
    + 'aria-valuemin="0" aria-valuemax="100" style="width:' + percentageNotStarted + '%">'
    + percentageNotStarted + '% not started'
    + '</div>'
    + '<div class="progress-bar progress-bar-warning" role="progressbar" aria-valuenow="70"'
    + 'aria-valuemin="0" aria-valuemax="100" style="width:' + percentageStarted + '%">'
    + percentageStarted + '% started'
    + '</div>'
    + '<div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="70"'
    + 'aria-valuemin="0" aria-valuemax="100" style="width:' + percentageFinished + '%">'
    + percentageFinished + '% complete'
    + '</div>'
    + '</div>';

  text += '<small>' + 'Started: ' + started
    + ' Finished:' + finished
    + ' Not Started:' + unstarted
    + ' Unscheduled:' + unscheduled
    + '</small>';

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

Handlebars.registerHelper("tasksComplete", function (tasks) {
  var numTasks = tasks.length;
  var tasksComplete = 0;

  if (tasks == null) {
    return 0;
  }

  tasks.forEach(function (task) {
    if (task.complete) {
      tasksComplete++;
    }
  });

  var percentage = (tasksComplete == 0 ? 0 : (100 / (numTasks / tasksComplete)));
  return percentage.toFixed(0);
});