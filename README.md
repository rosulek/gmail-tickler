Gmail Tickler
=============

By Mike Rosulek (rosulekm@eecs.oregonstate.edu)

Made available under the MIT license.

## What Is It?

Get email threads out of your inbox until a time+date that you specify.

The name "Tickler" comes from "Getting Things Done" (GTD) terminology. A **tickler** is a collection of items that require action at some time in the future. The act of defering an email until a later time is called "tickling" the email.

## How To Use It

There are two ways to tickle an email:

1. **By label:** Add a special label to the email, like `tickler/saturday/3pm` or `tickler/tomorrow` or `tickler/jul17` or `tickler/in 7 hours`.

2. **By email address:** Include a special email address as a recipient (To/CC/BCC) of an email, like `yourname+tickler+saturday+3pm@gmail.com` or `yourname+tickler+tomorrow@gmail.com`, etc.

Either way, the thread will reappear back in your inbox at the date+time you specified.

## Installation:

1. **Set up the script:**
    * Go to [script.google.com](https://script.google.com/), and create a new script, called "Tickler" or something.
    * Paste in code from the `gmail-tickler.gs` file in this repository. At the top of the script you will find some options to configure. If you are using the tickle-by-email-address feature, you must configure your email address.

2. **Set timezone:** To make sure the Tickler script runs in your native timezone, open the script editor in Google Apps, and go to the "File" menu, "Project properties." Check the box that says "Show "appsscript.json" manifest file in editor". You can then edit the `timeZone` value in the now-visible `appsscript.json` file.

3. **Create the labels:** In the toolbar on the script editor is a dropdown where you can select a function to be executed. Select the `setup` function and press the play button. This will add the appropriate labels to your gmail. 
    > *Note:* The first time you run the script, you'll have to authorize it to access your GMail. You may have to refresh GMail browser sessions to see the new labels, give them colors, etc.

4. **Set up a time-driven trigger** for processing of the Tickler file:
    * In the "resources" menu of the script editor, select "current project's triggers".
    * Add a new trigger for the function called `ticklerMain`, to be time-driven whenever you like. I suggest an 15- or 30-minute trigger.

5. **Add a Gmail filter** to get messages into the Tickler file, if you are using the tickle-by-email-address feature. You should add a filter for the search query `to:USERNAME+tickler from:me` (where `USERNAME` is your GMail ID), to bypass the inbox and assign the `tickler/email` label to messages. Yes, you can literally include `from:me` in the filter.

## More Details: Tickler Syntax:

When you tickle an email thread, you can specify the date+time as follows. When tickling by adding a label, you can replace spaces with slashes. When tickling by email address, you can replace spaces with `+` characters.

* Amount of time from now: `tomorrow`, `1 day`, `3wks`, `in1month`, `in 4 hrs`, ...

* Time of day: `11pm`, `2359` (24-hour time), `at 230am`, `noon`, ...

* Absolute date: `aug11`, `jan 1`, ...

* Day of week: `next tuesday`, `mon`, `next sat`, ...

* Combinations of the above: `1130am monday`, `jun 7 noon`, `1 week at 2pm`, `1am on sat`, ...

Commands like `jul 17`, `next tuesday`, `in 3 days` that don't specify a time of day, will restore the email at 8am on the requested day. This default time-of-day can be configured in the script.

The script always assumes you are referring to a date+time in the *future*:

* If you tickle a thread with command `sat 1pm` on a Saturday, the thread will be restored to the inbox either today at 1pm or in one week at 1pm, whichever is in the future. 

* Tickling a thread with command `aug 1 1pm` on August 1 means either 1pm today or 1pm on next year's August 1, whichever is in the future.

* Without any date given, `1pm` means either today or tomorrow at 1pm, whichever is in the future.

You can use the `test.html` file in this repository to play around with the date+time command syntax.

## More Usage Notes:

The first time the Gmail Tickler script finds an email to tickle, it computes the deadline date+time and moves the thread to a special label of the form `tickler/@/YYYY-MM-DD at HH:MM`. If you want to see what threads are currently in the Tickler, you can check everything in the `tickler/@/*` tree of labels. Along these lines, you can cancel the Tickler by removing this `tickler/@/*` label.

Some of these Tickler commands specify a *relative* deadline, like `next friday`, `in 3 hours`. But relative to what?

* If you've used email-address tickling, then the deadline is relative to the most recent message in the thread *for which `username+tickler+cmd@gmail.com` is a recipient*. So if other participants also follow up in the thread, the deadline won't be affected. However, the Tickler doesn't *mute* the thread --- it will always reappear in the inbox when there is new activity.

* If you've used label-based tickling, then the deadline is relative to the *first time the script runs after you apply the label*. The first time the script sees a thread with label `tickler/somedate/sometime`, it will replace that label with a fully-specified `tickler/@/*` label.

You may find it useful to apply Tickler labels using Gmail's built-in filters to automatically snooze emails matching a particular query to a certain day/time. For example, you might automatically apply `tickler/6pm` (and skip the inbox) to certain emails so that you aren't bothered by them until the end of the work day.

A similar effect can be achieved for individual threads with Gmail's mute feature, which is useful for noisy mailing lists. You can mute a thread in the Inbox with the `m` keyboard shortcut or from the More dropdown menu, and that will prevent it from being returned to your Inbox by future emails, unless those emails are sent directly to you. Muting threads will save you the effort of moving the thread to a Tickler label each time a new email arrives, and the Tickler will still return these threads to your inbox at the appropriate time.

## Fine Print / Known Limitations:

> Note: there are also some minor configurations/features documented only in the code comments. But they're all at the top of the script, if you're interested.

The script might not work correctly when you have lots (hundreds? thousands?) of emails under "Tickler management". Google Apps scripts are throttled in ways that are not entirely clear.

The script can only restore emails to the inbox as frequently as the Google Apps time trigger runs the script. So if you trigger the Tickler script to run every hour, don't expect the timing of restored emails to be more precise than one hour.

Threads will be restored to the inbox the first time the script runs **after the given date/time has passed.** So if you tickle an email until 11am Friday, and your processing script is triggered every hour, your email may not be restored until 11:59am Friday, or whenever the processing script happens to run. In general, if you have set up the processing script to trigger every N minutes, expect that emails might be restored to the inbox up to N minutes later than their given date/time.

> Note: there is an option in the Tickler script to "fudge" all times by a given amount. So if you set the fudge factor to 15 minutes, then an email designated for 2pm will be placed in your inbox even if the Tickler script happens to run at 1:45pm. Still, the disclaimers above all apply to the "fudged" time.

> A sensible usage of this fudge factor is to set it equal to the triggering interval. For example, set the fudge factor to 30 minutes, and trigger the processing script every 30 minutes. That way, tickling a thread to `2pm` means "restore this thread to the inbox by 2pm at the latest; i.e., sometime in the 30 minutes preceding 2pm."

## Comparison to Other Tools:

I encourage you to check out all of these and choose the one that's right for you. Here's my understanding of the major differences.

#### Core Google features:

When I originally wrote this script, there was no official Google support for any such feature. Since then, [Google Inbox](https://www.google.com/inbox/) introduced a built-in "Snooze" feature, followed by one in [Gmail itself](https://www.blog.google/products/g-suite/new-security-and-intelligent-features-new-gmail-means-business/). These certainly have the advantage of being an official feature.

Speaking personally, I find my gmail-tickler to be easier to use in the sense that (1) the deadline can be typed on the keyboard, and (2) the deadline can be expressed in relative terms (e.g., "8 days from now"). Snoozing an email in Gmail/Inbox seems to require lots of clicking around, not to mention math (if you want to figure out what day is 25 days from now).

#### Followup[then]:

The tickle-by-email system has similar syntax to [followupthen.com](http://followupthen.com) (FUT), and other similar services like [followup.cc](http://followup.cc). You include `datetime@followupthen.com` as a recipient of an email, and they will send that email back to you at the specified time.

* FUT syntax is a little cleaner: `datetime@followupthen.com` vs `yourname+tickler+datetime@gmail.com`.

* Using the Gmail Tickler script, your tickled emails never leave your Google's servers. I have no reason to be suspicious of FUT in particular, but this script is a more paranoid solution (assuming you are already comfortable with Gmail holding your email).

* FUT has more features: fancier date specifications, repeating events, replying to a group (instead of just making something appear in your own inbox).

* FUT is also probably more reliable about delivering emails at a precise time (Google Apps scripts like this one don't seem to be triggered at precise times).

#### Gmail Snooze / Email Snooze:

Google developers wrote [Gmail Snooze](http://googleappsdeveloper.blogspot.com/2011/07/gmail-snooze-with-apps-script.html) as a simple tutorial of the Google Apps Script system. It supports adding labels of the form `Snooze/Snooze 10 days` to messages.

[Email Snooze](http://messymatters.com/snooze/) is a similar Apps Script.

* Both snooze scripts only support simple snoozing of a certain number of days. Gmail Tickler supports absolute dates (e.g.: `aug2`), time-of-day, and relative dates other than "days" (e.g.: `2weeks`, `in 3 hours`).

#### Boomerang:

[Boomerang](http://www.boomeranggmail.com/) is an integrated browser extension and server-side script.

* Its interface is seamlessly integrated into Gmail, so it's much easier to use.

* You have to authorize their service to access your Gmail account, and you have to trust that they keep their promise to only look at headers. Again, I don't have reason to be suspicious of them in particular, but it is not the most paranoid solution.

## Changelog:

17 Aug 2013: initial version and quick bugfixes

28 Jul 2014: added support for label-based tickling

12 Jan 2016: bugfix [thanks, @lehrblogger]

14 Feb 2016: optional setting to remove labels on error [thanks, @lehrblogger]

11 Oct 2016: intuitive handling of relative dates in labels [idea suggested by @lehrblogger], other refactorings

27 Nov 2016: bugfix [thanks, @lehrblogger]

16 Jul 2020: fixed broken compatibility with getYear / getFullYear [thanks @Hamzehn]

## To do list:

* (Figure out how to) Bundle the script as a [web app](https://developers.google.com/apps-script/execution_web_apps) so installation is easy for everyone.

* Better error reporting.
