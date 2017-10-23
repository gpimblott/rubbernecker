var debug = require('debug')('rubbernecker:analysis');
var express = require('express');
var router = express.Router();
var projectFetcher = require('../lib/projectFetcher');
var dateFormat = require('dateformat');

var internals = {};

internals.getChanges = function (res, callback) {

}

/**
 * This is specifically used to find estimate changes at the moment
 */
router.get('/estimates/:days?', function (req, res, next) {
    var days = req.params[ "days" ];

    debug("Days=%s", days)
    if (!days) {
        days = 7;
    } else {
        days = parseInt(days);
        if (isNaN(days)) {
            days = 7;
        }
    }

    var queryDate = new Date();
    queryDate.setDate(queryDate.getDate() - days);
    queryDate.setUTCHours(0, 0, 0, 1);

    var dateSince = queryDate.toISOString();

    projectFetcher.getHistory(res.app.get('pivotalApiKey'), res.app.get('defaultProjects'),
        dateSince, function (error, results) {
            if (error) {
                debug(error)
            } else {
                var estimate_changed = [];
                var point_difference = 0;

                for (var attributeName in results) {
                    debug(attributeName)
                    var value = results[ attributeName ];

                    value.forEach(function (activity) {

                        if (activity.highlight == "estimated") {
                            // Build a new change record
                            var change_record ={};
                            change_record.message = activity.message;
                            change_record.performed_by = activity.performed_by.name;
                            change_record.project = activity.project.name;
                            change_record.occurred_at = dateFormat(activity.occurred_at, "dd/mm/yy");

                            // find the story
                            var size = activity.primary_resources.length;
                            for(var i=0;i<size;i++ ){
                                if( activity.primary_resources[i].kind='story'){
                                    change_record.story_name = activity.primary_resources[i].name;
                                    change_record.story_url = activity.primary_resources[i].url;
                                    break;
                                }
                            }

                            // find the change in the size
                            size = activity.changes.length;
                            for(var i=0;i<size;i++ ){
                                var change = activity.changes[i];
                                if(change.original_values.hasOwnProperty("estimate")){
                                    change_record.original_estimate = change.original_values.estimate;
                                    change_record.new_estimate = change.new_values.estimate;
                                    break;
                                }
                            }

                            change_record.difference = change_record.new_estimate - change_record.original_estimate;
                            point_difference += change_record.difference;

                            //debug(change_record);
                            estimate_changed.push(change_record)
                        }
                    })
                }
                res.render("estimates", {
                    'activities': estimate_changed,
                    'point_difference' : point_difference,
                    'date_since' : dateFormat(dateSince, "dd/mm/yy")
                } );
            }

        })

});

module.exports = router;