Gmail Tickler
=============

By Mike Rosulek (rosulekm@eecs.oregonstate.edu)

Made available under the MIT license.

## What Is It?

Alice asks you a question by email. You won't know the answer until Friday afternoon. Wouldn't it be nice if you could get that email out of your inbox until Friday? This script gives you two ways to do this automatically:

1. You reply to Alice saying "I'll find out on Friday and let you know", and BCC `yourname+tickler+friday+3pm@gmail.com` (or you can forward the thread to that email address, or you can just compose a new email thread to that email address).

2. OR, you add a label `tickler/friday/3pm` to the thread and archive it.

Either way, the thread is magically placed back in the inbox (appearing unread) on Friday afternoon.

The name "tickler" comes from "Getting Things Done" (GTD) terminology. A **tickler** is a collection of items that require action at some time in the future. The act of defering an email until a later time is called "tickling" the email.

## Tickler Command Syntax:

Here are some examples of supported tickler commands:

> **Note:** When using the command in an email address, you'll replace spaces in these commands with `+` characters (example: `USERNAME+tickler+next+tuesday@gmail.com`). When using the command in a label, you'll replace spaces with slashes (example: `tickler/next/tuesday`).

* Amount of time from now: `tomorrow`, `1 day`, `3wks`, `in 1month`, `in 4 hrs`, ...

* Time of day: `11pm`, `2359` (24-hour time), `at 230am`, `noon`, ...

* Absolute date: `aug11`, `jan 1`, ...

* Day of week: `next tuesday`, `mon`, `next sat`, ...

* Combinations of the above: `1130am monday`, `jun 7 noon`, `1day at 2pm`, `1am on sat`, ...

Commands like `jul 17`, `next tuesday`, `in 3 days` that don't specify a time of day, will restore the email at 8am on the requested day. This default time-of-day can be configured in the script.

Specifying a date like `sat 1pm` on a Saturday will schedule the email for today if it's currently before 1pm, otherwise for a week from today. Similarly, specifying `aug 1 1pm` on August 1 will schedule the email for either today or next year's August 1. If you're really interested, you can use the `test.html` file in this repository to play around with the date/time specification syntax.

## More Usage Notes:

How do you cancel the tickler on a thread? For email-address tickling, find the thread filed under the `tickler` label, and remove that label. For label-based tickling, remove the `tickler/command` label.

Some of these tickler commands specify a *relative* deadline, like `next friday`, `in 3 hours`. But relative to what? 

* If you've used email-address tickling, then the deadline is relative to the most recent message in the thread *for which `username+tickler+cmd@gmail.com` is a recipient*. So if other participants also follow up in the thread, the deadline won't be affected (but the message will also re-appear in the inbox in the meantime, because of the new activity in the thread).

* If you've used label-based tickling, then the deadline is relative to the most recent message in the thread. So if other participants follow up in the thread, the deadline could move. Importantly, the deadline is **not** relative to the time you *applied* the label. As far as I know, there is no way to find out when a label was applied to a thread.

## Installation:

1. **Set up the script:**
    * Go to [drive.google.com](http://drive.google.com), and create a new spreadsheet, called "Tickler" or something.
    * In the "tools" menu of the spreadsheet, select "script editor".
    * Select "blank project", and paste in code from the `gmail-tickler.gs` file in this repository. You'll have to change the configuration options near the top of the script to reflect your email address. There are other options as well, documented there.

2. **Create the labels:** In the toolbar on the script editor is a dropdown where you can select a function to be executed. Select the `setup` function and press the play button. This will add the appropriate labels to your gmail. 
    > *Note:* You'll have to authorize the spreadsheet to access your gmail at this point. And you'll have to refresh any gmail browser sessions to see the new labels, give them colors, etc.

3. **Set up a time-driven trigger** for processing of the tickler file:
    * In the "resources" menu of the script editor, select "current project's triggers".
    * Add a new trigger for the function called `processThreads`, to be time-driven whenever you like. I suggest an hourly trigger.

4. **Add a Gmail filter** to get messages into the tickler file. You should add a filter for the search query `to:USERNAME+tickler from:me`, to bypass the inbox and assign the `tickler` label to messages. Yes, you can literally include `from:me` in the filter.

## Fine Print / Known Limitations:

> Note: there are also some minor configurations/features documented only in the code comments. But they're all at the top of the script, if you're interested.

To change the time zone used by Gmail Tickler, open the script editor in Google Apps, and go to the "File" menu, "Project properties."

The script might not work correctly when you have lots (hundreds? thousands?) of emails in your tickler. Google Apps scripts are throttled in ways that are not entirely clear.

I also don't understand the granularity or reliability of time-triggered Google Apps scripts. Triggering this script every minute may or may not work. I have mine triggered every hour. I would not stake my life on the processing script being triggered at precise times (at the 1-minute level of granularity).

Tickled threads will be restored to the inbox on the first time the processing script runs **after the given date/time has passed.** So if you tickle an email until 11am Friday, and your processing script is triggered every hour, your email may not be restored until 11:59am Friday, or whenever the processing script happens to run. In general, if you have set up the processing script to trigger every N minutes, expect that emails might be restored to the inbox up to N minutes later than their given date/time.

> Note: there is an option in the tickler script to "fudge" all times by a given amount. So if you set the fudge factor to 15 minutes, then an email designated for 2pm will be placed in your inbox even if the tickler script happens to run at 1:45pm. Still, the disclaimers above all apply to the "fudged" time.

> A sensible usage of this fudge factor is to set it equal to the triggering interval. For example, set the fudge factor to 1 hour, and trigger the processing script every hour. That way, tickling a thread to `2pm` means "restore this thread to the inbox by 2pm at the latest; i.e., sometime in the hour preceding 2pm."

## Comparison to Other Tools:

I encourage you to check out all of these and choose the one that's right for you. Here's my understanding of the major differences.

#### Followup[then]:

The tickle-by-email system has similar syntax to [followupthen.com](http://followupthen.com) (FUT), and other similar services like [followup.cc](http://followup.cc). You include `datetime@followupthen.com` as a recipient of an email, and they will send that email back to you at the specified time.

* FUT syntax is a little cleaner: `datetime@followupthen.com` vs `yourname+tickler+datetime@followupthen.com`.

* Using the Gmail Tickler script, your tickled emails never leave your Google's servers. I have no reason to be suspicious of FUT in particular, but this script is a more paranoid solution (assuming you are already comfortable with Gmail holding your email).

* FUT has more features: fancier date specifications, repeating events, replying to a group (instead of just making something appear in your own inbox).

* FUT is also probably more reliable about delivering emails at a precise time (Google Apps scripts like this one don't seem to be triggered at precise times).

#### Gmail Snooze / Email Snooze:

Google developers wrote [Gmail Snooze](http://googleappsdeveloper.blogspot.com/2011/07/gmail-snooze-with-apps-script.html) as a simple tutorial of the Google Apps Script system. It supports adding labels of the form `Snooze/Snooze 10 days` to messages.

[Email Snooze](http://messymatters.com/snooze/) is a similar Apps Script.

* Both snooze scripts only support simple snoozing of a certain number of days. Gmail Tickler supports absolute dates (e.g.: `aug2`), time-of-day, and relative dates other than "days" (e.g.: `2weeks`).

#### Boomerang:

[http://www.boomeranggmail.com/](Boomerang) is an integrated browser extension and server-side script.

* Its interface is seamlessly integrated into Gmail, so it's much easier to use.

* You have to authorize their service to access your Gmail account, and you have to trust that they keep their promise to only look at headers. Again, I don't have reason to be suspicious of them in particular, but it is not the most paranoid solution.

## Changelog:

17 Aug 2013: initial version and quick bugfixes

28 Jul 2014: added support for label-based tickling

## To do list:

* (Figure out how to) Bundle the script as a [https://developers.google.com/apps-script/execution_web_apps](web app) that others can add easily.

* Wait until [http://www.theverge.com/2014/4/2/5574002/gmail-reportedly-testing-new-inbox-tabs-snooze-feature-for-messages](Google natively implements something like this anyway).

* Better error reporting.
