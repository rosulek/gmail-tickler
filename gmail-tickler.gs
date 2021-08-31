/*
 * Gmail Tickler, a Google Apps script
 * written by Mike Rosulek, rosulekm@eecs.oregonstate.edu
 *
 * Revision: 16 Jul 2020
 *
 * Made available under the MIT license. See the license and instructions at:
 *
 *          http://github.com/rosulek/gmail-tickler
 */ 



/*
 * 1: SET UP config options 
 */
var BASE_LABEL = "tickler";

// when a tickle-command label is added to a thread:
var TICKLE = {
    archive:            true,
    mark_unread:        true,
    label_prefix:       BASE_LABEL + '/@',
    default_time:       "8:00", // hh:mm, 24-hour format

    cleanup_labels:     true,   // remove the label containing the initial tickle-command
    cleanup_exempt:             // ... unless it's one of these:
        [ "today", "tomorrow", 
          "sun", "mon", "tue", "wed", "thu", "fri", "sat",
          "1wk", "2wks"
        ].map( function(x){ return BASE_LABEL + "/" + x })
};

// when the deadline for a tickled thread is reached:
var RESTORE = {
    apply_label:        BASE_LABEL + '/restored',   // or false
    mark_unread:        true,
    move_to_inbox:      true,
    fudge_factor:       15      // restore if within this many minutes of deadline
};

// when a tickle command is sent as part of the email address
var EMAIL = {
    label:              BASE_LABEL + '/email',    // look for such emails in this label
    address_prefix:     'yourname+tickler',       // for yourname@gmail.com
};

var ERROR = {
    apply_label:        BASE_LABEL + '/error',    // or false
    keep_label:         true,
    move_to_inbox:      true,
    mark_unread:        true
};

var DRY_RUN = false;

/*
 * 2. RUN THIS ONCE, first, to create necessary labels
 */
function setup() {
    GmailApp.createLabel(BASE_LABEL);
    GmailApp.createLabel(TICKLE.label_prefix);

    if (RESTORE.apply_label)
        GmailApp.createLabel(RESTORE.apply_label);
    if (ERROR.apply_label)
        GmailApp.createLabel(ERROR.apply_label);
    if (EMAIL.label)
        GmailApp.createLabel(EMAIL.label);

    for (var i=0; i<TICKLE.cleanup_exempt.length; i++) {
        GmailApp.createLabel(TICKLE.cleanup_exempt[i]);
    }
}

/*
 * 3. SET A TRIGGER for this function:
 */
function ticklerMain() {
    Logger.clear();
    processLabels(false);
    processLabels(true);
}

// don't go beyond this point! ... or do... I'm a code comment, not a cop.
////////////////////////////////////////////////////////////////////////////

function processLabels(restoreOnly) {  // run a second time to restore just-tickled threads
    var labels = GmailApp.getUserLabels();
    for (var i=0; i < labels.length; i++) {
        var lbl = labels[i];
        var action = labelAction(lbl);
        if (action == "ignore") continue;

        Logger.log("processLabels(restoreOnly=" + restoreOnly + "): label " + lbl.getName() + " ==> action = " + action);

        if (action == "tickle" && !restoreOnly) tickleLabel(lbl);
        if (action == "restore")                restoreLabel(lbl);
        if (action == "email" && !restoreOnly)  emailTickleLabel(lbl);
    }
}

function labelAction(lbl) {
    var name = lbl.getName();
    if ( name.indexOf(BASE_LABEL + "/") != 0 ) return "ignore";  // not in the tickler tree
    if ( name == ERROR.apply_label ) return "ignore";            // 'error' label
    if ( name == EMAIL.label ) return "email";
    if ( name == RESTORE.apply_label ) return "ignore";          // 'finished' label
    if ( name == TICKLE.label_prefix ) return "ignore";          // internal tickler catch-all
    if ( name.indexOf(TICKLE.label_prefix) == 0 ) return "restore";    // internal tickler
    return "tickle";
}


function tickleLabel(lbl) {
    var threads = lbl.getThreads();
    Logger.log("tickleLabel: label " + lbl.getName() + " has " + threads.length + " threads");
    
    if (threads.length) {
        // BASE_LABEL guaranteed to be prefix of lbl.getName(); +1 is for trailing slash
        var cmd = lbl.getName().substr( BASE_LABEL.length + 1 );
        cmd = cmd.replace(/\/|\./g, " ");

        var target = parseTicklerCommand(cmd);

        if (! target['getTime']) {
            errorLabel(lbl, target);

        } else {
            var newlblname = TICKLE.label_prefix + "/" + date2str(target);
            Logger.log("tickleLabel: moving " + threads.length + " items to label " + newlblname);

            if (DRY_RUN) return;

            var newlbl = GmailApp.createLabel(newlblname);
            for (var i=0; i<threads.length; i++) {
                threads[i].addLabel(newlbl);
                threads[i].removeLabel(lbl);
                if (TICKLE.archive) threads[i].moveToArchive();
                if (TICKLE.mark_unread) threads[i].markUnread();
            }
        }
    }

    if (TICKLE.cleanup_labels && TICKLE.cleanup_exempt.indexOf(lbl.getName()) == -1) {
        Logger.log("tickleLabel: cleaning up empty label " + lbl.getName());
        if (DRY_RUN) return;

        lbl.deleteLabel();
    }
}

function emailTickleLabel(lbl) {
    var threads = lbl.getThreads();
    Logger.log("emailTickleLabel: label " + lbl.getName() + " has " + threads.length + " threads");
    
    if (! threads.length) return;
 
    for (var i=0; i<threads.length; i++) {
        var info = extractEmailTickleInfo(threads[i]);
        info.command = info.command.replace(/\+|\./g, " ");

        var target = parseTicklerCommand(info.command, info.baseline);
        if (! target['getTime']) {
            errorLabel(lbl, target);

        } else {
            var newlblname = TICKLE.label_prefix + "/" + date2str(target);
            Logger.log("emailTickleLabel: moving thread to label " + newlblname);

            if (DRY_RUN) return;

            var newlbl = GmailApp.createLabel(newlblname);
            threads[i].addLabel(newlbl);
            threads[i].removeLabel(lbl);
        }
    }
}

function extractEmailTickleInfo(t) {
    var msgs = t.getMessages();
    var result = { baseline: new Date() };

    Logger.log("extractEmailTickleInfo: extracting info from thread `" + t.getFirstMessageSubject() + "`");
    
    for (var i = msgs.length - 1; i >= 0; i--) {
        var m = msgs[i];
        var recpts = m.getTo() + "," + m.getCc() + "," + m.getBcc();
        if (recpts.indexOf( EMAIL.address_prefix ) >= 0) {
            var suffix = recpts.substr( recpts.indexOf(EMAIL.address_prefix) + EMAIL.address_prefix.length );
            var match  = suffix.match(/^[^@]+/);
            if (match) {
                result.command = match[0].replace(/\.|\+/g, " ");
                result.baseline = m.getDate();
                Logger.log("extractEmailTickleInfo: message #" + (i+1) + " of thread contains tickler command: `" + result.command + "`");
            }
            break;
        }
    }
  
    return result;
}
      

function restoreLabel(lbl) {
    // TICKLE.label guaranteed to be prefix of lbl.getName(); +1 is for trailing slash
    var datestr = lbl.getName().substr( TICKLE.label_prefix.length + 1 );
    var target = str2date(datestr);
    if (!target) {
        if (!datestr) errorLabel(lbl, "don't understand " + datestr);
        return;
    }
    Logger.log("restoreLabel: interpreting " + datestr + " as " + target);

    var threads = lbl.getThreads();

    var now = new Date();
    now.setMinutes( now.getMinutes() + RESTORE.fudge_factor );
 
    if (now.getTime() >= target.getTime()) {
        Logger.log("restoreLabel: restoring " + threads.length + " threads");
        if (DRY_RUN) return;

        for (var i=0; i<threads.length; i++) {
            if (RESTORE.apply_label) threads[i].addLabel( GmailApp.getUserLabelByName(RESTORE.apply_label) );
            if (RESTORE.mark_unread) threads[i].markUnread();
            if (RESTORE.move_to_inbox) threads[i].moveToInbox();
        }
        lbl.deleteLabel();
    
    } else if (threads.length == 0) {
       Logger.log("restoreLabel: cleaning up empty label");
       if (!DRY_RUN) lbl.deleteLabel(); 
    }
    
}

function errorLabel(lbl, errMsg) {
    Logger.log("errorLabel: " + lbl.getName() + " ==> " + errMsg);

    if (DRY_RUN) return;

    var threads = lbl.getThreads();
    for (var i=0; i<threads.length; i++) {
        if (ERROR.apply_label) threads[i].addLabel( GmailApp.getUserLabelByName( ERROR.apply_label ) );
        if (! ERROR.keep_label) threads[i].removeLabel(lbl);
        if (ERROR.move_to_inbox) threads[i].moveToInbox();
        if (ERROR.mark_unread) threads[i].markUnread();
    }
}



function twodigit (v) {
    if (v < 10) v = "0" + v;
    return "" + v;
}

function date2str (d) {
    var Y, M, D, h, m;
    Y = d.getFullYear();
    M = twodigit( d.getMonth() + 1 );
    D = twodigit( d.getDate() );
    h = twodigit( d.getHours() );
    m = twodigit( d.getMinutes() );

    return Y + "-" + M + "-" + D + " at " + h + ":" + m;
}

function str2date (s) {
    var matches = s.match(/^(\d{4})-(\d\d)-(\d\d) at (\d\d):(\d\d)$/);
    if (!matches) return;
    
    var d = new Date();
    d.setYear( matches[1] );
    d.setMonth( matches[2]-1 );
    d.setDate( matches[3] );
    d.setHours( matches[4] );
    d.setMinutes( matches[5] );
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
}

var DOW    = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
var MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

function parseTicklerCommand(s, baseline) {
    if (!baseline) baseline = new Date();

    var matches;
    var theDate = new Date(baseline.getTime()); // clone: don't modify 
    var timeReason, dateReason, ifPast, conflicts;

    Logger.log("parseTicklerCommand: parsing `" + s + "` with baseline = " + baseline);

    var charsRemain = s.length + 1;
    while (charsRemain && charsRemain != s.length) {
        charsRemain = s.length;
        s = s.replace(/^\s*/, "");

        matches = s.match(/^(?:in\s*)?(\d+)\s*(min(?:ute)?s?|h(?:(?:ou)?r)?s?|w(?:(?:ee)?k)?s?|mon(?:th)?s?|d(?:ay)?s?|y(?:(?:ea)?r)?s?)/i);
        if (matches) {
            var shortunit = matches[2].substr(0,1).toLowerCase();
            var fullunit  = matches[2].substr(0,3).toLowerCase();
            var amount    = parseInt(matches[1], 10);

            if (dateReason) {
                conflicts = [dateReason, matches[0]];
                break;
            }
            dateReason = matches[0];

            if (fullunit == "min") {
                if (timeReason) {
                    conflicts = [timeReason, matches[0]];
                    break;
                }
                timeReason = matches[0];

                theDate.setMinutes( theDate.getMinutes() + amount );
            } else if (shortunit == "h") {
                if (timeReason) {
                    conflicts = [timeReason, matches[0]];
                    break;
                }
                timeReason = matches[0];

                theDate.setHours( theDate.getHours() + amount );
            } else if (shortunit == "d") {
                theDate.setDate( theDate.getDate() + amount );
            } else if (shortunit == "w") {
                theDate.setDate( theDate.getDate() + 7 * amount );
            } else if (fullunit == "mon") {
                theDate.setMonth( theDate.getMonth() + amount );
            } else if (shortunit == "y") {
                theDate.setFullYear( theDate.getFullYear() + amount );
            }

            s = s.substr(matches[0].length);
            continue;
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
            continue;
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
            continue;
        }

        matches = s.match(/^(?:at\s*)?(noon|midnight|([1-9]|1[012])(?::?([0-5]\d))?([ap]m?)|([01]?\d|2[0-3])(?::?([0-5]\d))(?![apAP0-9]))/i);
        if (matches) {
            if (timeReason) {
                conflicts = [timeReason, matches[0]];
                break;
            }
            timeReason = matches[0];

            if (!ifPast) ifPast = "d";

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

    if (! timeReason) {
        var m = TICKLE.default_time.match(/^(\d\d?):(\d\d)$/);
        if (!m) return "default time " + TICKLE.default_time + " invalid";
      
        theDate.setHours( parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    }

    if (theDate.getTime() < baseline.getTime()) {
        if (ifPast == "y")
            theDate.setFullYear( theDate.getFullYear() + 1);
        else if (ifPast == "w")
            theDate.setDate( theDate.getDate() + 7 );
        else if (ifPast == "d")
            theDate.setDate( theDate.getDate() + 1 );
        else
            return "illegal date in past";
    }

    return theDate;
}
