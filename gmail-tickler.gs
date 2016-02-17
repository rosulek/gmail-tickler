/*
 * Gmail Tickler, a Google Apps script
 * written by Mike Rosulek, rosulekm@eecs.oregonstate.edu
 *
 * Revision: 15 Feb 2016
 *
 * Made available under the MIT license. See the license and instructions at:
 *
 *          http://github.com/rosulek/gmail-tickler
 */ 

/*
 * 1: SET UP config options 
 */
var EMAIL_PREFIX     = "USERNAME+tickler"; // where USERNAME@gmail.com is your regular address
var TICKLER_LABEL    = "tickler";
var FINISH_LABEL     = "tickler/finished"; // label name, or `false`
var ERROR_LABEL      = "tickler/error";    // label name, or `false`
var REMOVE_CONFLICTS = false;              // remove conflicting labels when an error is encountered
var MARK_UNREAD      = true;               // mark unread when restoring a message to the inbox
var EMAIL_ERRORS     = true;               // report error message as email reply within thread

var CLEANUP_LABELS = true;               // remove empty tickler-command labels
var EXEMPT_LABELS  =                     // labels to have around even if empty
    [ "tomorrow", "sun", "mon", "tue",
      "wed", "thu", "fri", "sat",
      "1wk", "2wks"
    ].map( function(x){ return TICKLER_LABEL + "/" + x });


var DEFAULT_TIME   = [8, 0, 0, 0];       // for dates that don't specify a time-of-day,
                                         // use the following, as [hr,min,sec,milli];
                                         // note: hour is in 24-hour format

var FUDGE_FACTOR   = 15;                 // a thread will be restored to the inbox
                                         // as long as its deadline is no more than
                                         // this many minutes in the future.

var DRY_RUN        = false;              // set to true to make no changes (log only)

/*
 * 2. RUN THIS ONCE, first, to create necessary labels
 */
function setup() {
    GmailApp.createLabel(TICKLER_LABEL);
    if (FINISH_LABEL)
        GmailApp.createLabel(FINISH_LABEL);
    if (ERROR_LABEL)
        GmailApp.createLabel(ERROR_LABEL);

    for (var i=0; i<EXEMPT_LABELS.length; i++) {
        GmailApp.createLabel(EXEMPT_LABELS[i]);
    }
}

/*
 * 3. SET A TRIGGER for this function:
 */
function processThreads() {
    Logger.clear();

    var threads = getThreadsToTickle();

    Logger.log("processing " + threads.length + " threads in all");

    var now  = new Date();
    now.setMinutes( now.getMinutes() + FUDGE_FACTOR );
    for (var i = 0; i < threads.length; i++) {
        var info = ticklerInfo(threads[i]);

        if (! info)
            continue;

        if (! info.target || ! info.target['getTime']) {
            errorThread(threads[i], info);
            continue;
        }

        Logger.log("thread target time is " + info.target);

        if (now.getTime() >= info.target.getTime())
            untickleThread(threads[i]);
    }

    if (CLEANUP_LABELS) cleanupLabels();
}

// don't go beyond this point! ... or do... I'm a code comment, not a cop.
////////////////////////////////////////////////////////////////////////////


function getThreadsToTickle() {
    var label    = GmailApp.getUserLabelByName(TICKLER_LABEL);
    var threads  = label.getThreads();

    Logger.log("found " + threads.length + " messages labeled: " + TICKLER_LABEL);

    var tlabels = getAllTicklerCmdLabels();
    for (var i=0; i<tlabels.length; i++) {
        var newthreads = tlabels[i].getThreads();
        if (newthreads.length) {
            Logger.log("found " + newthreads.length + " messages labeled: " + tlabels[i].getName());
            for (var j=0; j<newthreads.length; j++) {
                threads.push( newthreads[j] );
            }
        }
    }

    return threads;
}

function getAllTicklerCmdLabels() {
    return GmailApp.getUserLabels().filter( function(lbl) { return isTicklerCmd(lbl) } );
}

function isTicklerCmd(lbl) {
    var lblname = lbl.getName();
    return lblname.indexOf(TICKLER_LABEL + "/") == 0
                && lblname.indexOf(FINISH_LABEL) != 0
                && lblname.indexOf(ERROR_LABEL) != 0;
}

function getTicklerCmdLabels(t) {
    return t.getLabels().filter( function(lbl) { return isTicklerCmd(lbl) } );
}

function ticklerInfo(t) {
    var msgs = t.getMessages();
    if (!msgs) {
        Logger.log("no messages found in thread `" + t.getFirstMessageSubject() + "`");
        return false;
    }
    var result = { baseline: msgs[msgs.length-1].getDate() };

    Logger.log("extracting info from thread `" + t.getFirstMessageSubject() + "`");

    // tickler command from email target

    for (var i = msgs.length - 1; i >= 0; i--) {
        var m = msgs[i];
        var recpts = m.getTo() + "," + m.getCc() + "," + m.getBcc();
        if (recpts.indexOf( EMAIL_PREFIX ) >= 0) {
            var suffix = recpts.substr( recpts.indexOf(EMAIL_PREFIX) + EMAIL_PREFIX.length );
            var match  = suffix.match(/^[^@]+/);
            if (match) {
                result.command = match[0].replace(/\.|\+/g, " ");
                result.baseline = m.getDate();
                Logger.log("message #" + (i+1) + " of thread contains tickler command: `" + result.command + "`");
            }
            break;
        }
    }

    // tickler command from labels

    var labels = getTicklerCmdLabels(t);
    for (var i = 0; i<labels.length; i++) {
        var cmd = labels[i].getName().substr( TICKLER_LABEL.length + 1 ); // +1 for trailing slash
        cmd = cmd.replace(/\/|\./g, " ");
        if (! result.command) {
            result.command = cmd;
        } else {
            result.command += " " + cmd;
        }
        Logger.log("thread also contains label " + labels[i].getName() + " with command " + cmd);
    }

    if (result.command)
        result.target = parseDate(result.command, result.baseline);
    else
        Logger.log("no tickler command found");

    return result;
}


var DOW    = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
var MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function parseDate(s, baseline) {
    var matches;
    var theDate = new Date(baseline.getTime()); // clone
    var timeReason, dateReason, ifPast, conflicts;

    Logger.log("parsing tickler command `" + s + "` with baseline = " + baseline);

    var charsRemain = s.length + 1;
    while (charsRemain && charsRemain != s.length) {
        charsRemain = s.length;
        s = s.replace(/^\s*/, "");

        matches = s.match(/^(?:in\s*)?(\d+)\s*(h(?:(?:ou)?r)?s?|w(?:(?:ee)?k)?s?|mon(?:th)?s?|d(?:ay)?s?|y(?:(?:ea)?r)?s?)/i);
        if (matches) {
            var unit = matches[2].substr(0,1).toLowerCase();
            var amount = parseInt(matches[1], 10);

            if (dateReason) {
                conflicts = [dateReason, matches[0]];
                break;
            }
            dateReason = matches[0];

            if (unit == "h") {
                if (timeReason) {
                    conflicts = [timeReason, matches[0]];
                    break;
                }
                timeReason = matches[0];

                theDate.setHours( theDate.getHours() + amount );
            } else if (unit == "d") {
                theDate.setDate( theDate.getDate() + amount );
            } else if (unit == "w") {
                theDate.setDate( theDate.getDate() + 7 * amount );
            } else if (unit == "m") {
                theDate.setMonth( theDate.getMonth() + amount );
            } else if (unit == "y") {
                theDate.setFullYear( theDate.getFullYear() + amount );
            }

            s = s.substr(matches[0].length);
        }

        matches = s.match(/^(tomorrow|today|(?:on\s*)?(next\s*)?(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:n(?:es(?:day)?)?)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?))/i);
        if (matches) {

            if (dateReason) {
                conflicts = [dateReason, matches[0]];
                break;
            }
            dateReason = matches[0];

            if (matches[1].toLowerCase() == "tomorrow") {
                theDate.setDate( theDate.getDate() + 1 );

            } else if (matches[1].toLowerCase() == "today") {
                // do nothing
            } else {
                var dow = DOW[ matches[3].substr(0,3).toLowerCase() ];
                var offset = (dow + 7 - baseline.getDay()) % 7;
                var next = !! matches[2];
                if (dow >= baseline.getDay() && next)
                    offset += 7;

                theDate.setDate( theDate.getDate() + offset );
                ifPast = "w";
            }

            s = s.substr(matches[0].length);
        }

        matches = s.match(/^(?:on\s*)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d+)/i);
        if (matches) {
            var mon = MONTHS[ matches[1].substr(0,3).toLowerCase() ];
            var day = parseInt(matches[2], 10)

            if (dateReason) {
                conflicts = [dateReason, matches[0]];
                break;
            }
            dateReason = matches[0];
            ifPast = "y";

            theDate.setMonth(mon);
            theDate.setDate(day);

            s = s.substr(matches[0].length);
        }

        matches = s.match(/^(?:at\s*)?(noon|midnight|([1-9]|1[012])(?:([0-5]\d))?([ap]m?)|([01]?\d|2[0-3])([0-5]\d)(?![apAP0-9]))/i);
        if (matches) {
            if (timeReason) {
                conflicts = [timeReason, matches[0]];
                break;
            }
            timeReason = matches[0];

            var hour;
            if (matches[1].toLowerCase() == "noon") {
                hour = 12; minute = 0;
            } else if (matches[1].toLowerCase() == "midnight") {
                hour = 0;  minute = 0;
            } else if (matches[2]) {
                hour = (parseInt(matches[2], 10) % 12) + (matches[4].substr(0,1).toLowerCase() == "p" ? 12 : 0);
                minute = matches[3] ? parseInt(matches[3], 10) : 0;
            } else {
                hour = parseInt(matches[5], 10);
                minute = parseInt(matches[6], 10);
            }   
            
            theDate.setHours(hour, minute, 0, 0);
            s = s.substr(matches[0].length);
            continue;
        }


    }

    if (conflicts)
        return "`" + conflicts[0] + "` conflicts with `" + conflicts[1] + "`"

    if (s.match(/\S/)) {
        return "unrecognized: `" + s + "`";
    }

    if (! timeReason)
        theDate.setHours.apply(theDate, DEFAULT_TIME);
  
    if (theDate.getTime() < baseline.getTime()) {
        if (ifPast == "y")
            theDate.setFullYear( theDate.getFullYear() + 1);
        else if (ifPast == "w")
            theDate.setDate( theDate.getDate() + 7 );
        else
            return "illegal date in past";
    }

    return theDate;
}

function untickleThread(t) {
    Logger.log("restoring thread `" + t.getFirstMessageSubject() + "`");

    if (DRY_RUN) return;

    if (MARK_UNREAD)
        t.markUnread();

    if (FINISH_LABEL)
        GmailApp.getUserLabelByName(FINISH_LABEL).addToThread(t);

    var labels = getTicklerCmdLabels(t);
    for (var i=0; i<labels.length; i++) {
        t.removeLabel(labels[i]);
    }

    GmailApp.getUserLabelByName(TICKLER_LABEL).removeFromThread(t);
    t.moveToInbox();
}

function cleanupLabels() {
    var labels = getAllTicklerCmdLabels();
    for (var i=0; i<labels.length; i++) {
        var lname = labels[i].getName();
        if (EXEMPT_LABELS.indexOf(lname) == -1 && labels[i].getThreads().length == 0) {
            Logger.log("deleted empty tickler-command label " + lname);
            GmailApp.deleteLabel(labels[i]);
        }
    }
}

function errorThread(t, info) {
    Logger.log("reporting error for thread `" + t.getFirstMessageSubject() + "`: " + info.target);

    if (DRY_RUN) return;

    if (REMOVE_CONFLICTS) {
        var labels = getTicklerCmdLabels(t);
        for (var i=0; i<labels.length; i++) {
            t.removeLabel(labels[i]);
        }
    }

    GmailApp.getUserLabelByName(TICKLER_LABEL).removeFromThread(t);
    t.moveToInbox();

    if (info.msg && EMAIL_ERRORS) {
        var err;
        if (! info.command)
            err = "No tickler command found!";
        else if (! info.target['getTime'])
            err = "Error processing tickler command: " + info.target;
        else
            err = "Unknown error!?";

        Logger.log("error was: " + err);
        info.msg.reply(err, {noReply: true});
    }

    if (ERROR_LABEL)
        GmailApp.getUserLabelByName(ERROR_LABEL).addToThread(t);

}

