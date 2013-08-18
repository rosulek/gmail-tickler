Gmail Tickler
=============

By Mike Rosulek (rosulekm@eecs.oregonstate.edu)

Made available under the MIT license.

## About:

In "Getting Things Done" (GTD) terminology, a **tickler** is a collection of items that require action at some time in the future. These items are kept "out of sight, out of mind" in a separate *tickler file* until their specified date.

This script provides tickler functionality completely within Gmail. By sending email to yourself and including a special command, the email thread is moved out of your inbox until the date/time that you specify.


#### Followupthen:

This script was inspired by the very clever [followupthen.com](http://followupthen.com). If you like the idea of an email-based tickler, I encourage you to check out their service. Here are the important differences:

* Using the Gmail Tickler script, your deferred emails never leave your own Gmail account. With followupthen, you typically email a special address at `followupthen.com`. I have no reason to be suspicious of their service, but the Gmail Tickler script is a more paranoid solution (assuming you are already comfortable with Gmail holding your email).

* Followupthen has more features: fancier date specifications, repeating events, replying to a group (instead of just making something appear in your own inbox). Their service is also probably more reliable about delivering emails at a precise time (Google Apps scripts like Gmail Tickler don't seem to be triggered at precise times).

## How to Use This Script:

From Gmail, send email to the address `USERNAME+tickler+CMD@gmail.com`, where `USERNAME@gmail.com` is your normal Gmail address, and `CMD` specifies the date/time you want the thread to be restored to your inbox.

You can compose a new email to this special address, forward an existing thread to that address, or include that address as a Bcc on an email that you'll be sending anyway. All of these actions will have the effect of activating the tickler on the entire thread.

Some examples of supported date/time specification commands:

* Amount of time from now: `tomorrow`, `1+day`, `3wks`, `in+1month`, `in+4+hrs`, ...

* Time of day: `11pm`, `2359` (24-hour time), `at+230am`, `noon`, ...

* Absolute date: `aug11`, `jan+1`, ...

* Day of week: `next+tuesday`, `mon`, `next+sat`, ...

* Combinations of the above: `1130am+monday`, `jun+7+noon`, `1day+at+2pm`, `1am+on+sat`, ...

Commands like `jul+17`, `next+tuesday`, `in+3+days` that don't specify a time of day, will restore the email at 8am on the requested day. This default time-of-day can be configured in the script.

Specifying a date like `sat+1pm` on a Saturday will schedule the email for today if it's currently before 1pm, otherwise for a week from today. Similarly, specifying `aug+1+1pm` on August 1 will schedule the email for either today or next year's August 1. If you're really interested, you can use the `test.html` file in this repository to play around with the date/time specification syntax.

The processing script will look for the *last* message in the thread that is addressed to `USERNAME+tickler+anything@gmail.com`. So the thread can continue after it is put in the tickler file. If someone else follows up to the thread, it will reappear in the inbox as normal (but still be processed for the tickler action, as long as it has the `tickler` label).

You can change the restoration date by adding another message to the thread, addressed to one of the special email addresses. To cancel the tickler action on a thread completely, just remove the `tickler` label from the thread.

Relative dates like `5+days`, `tomorrow`, `in+3+yrs` are relative to the message within the thread that contains the tickler-command. Other messages in the thread will not affect the restoration time.

If the processing script is unable to understand the date/time specification of a thread that has the `tickler` label, it will move that thread to the inbox, put the `tickler/error` label on it, and (by default) reply to the thread with an error message.


## Fine Print / Known Limitations:

To change the time zone used by Gmail Tickler, open the script editor in Google Apps, and go to the "File" menu, "Project properties."

The script might not work correctly when you have lots (hundreds? thousands?) of emails in your tickler. Google Apps scripts are throttled in ways that are not entirely clear.

I also don't understand the granularity or reliability of time-triggered Google Apps scripts. Triggering this script every minute may or may not work. I have mine triggered every hour. I would not stake my life on the processing script being triggered at precise times (at the 1-minute level of granularity).

Tickled threads will be restored to the inbox on the first time the processing script runs **after the given date/time has passed.** So if you tickle an email until 11am Friday, and your processing script is triggered every hour, your email may not be restored until 11:59am Friday, or whenever the processing script happens to run. In general, if you have set up the processing script to trigger every N minutes, expect that emails might be restored to the inbox up to N minutes later than their given date/time.

> Note: there is an option in the tickler script to "fudge" all times by a given amount. So if you set the fudge factor to 15 minutes, then an email designated for 2pm will be placed in your inbox even if the tickler script happens to run at 1:45pm. Still, the disclaimers above all apply to the "fudged" time.

> A sensible usage of this fudge factor is to set it equal to the triggering interval. For example, set the fudge factor to 1 hour, and trigger the processing script every hour. That way, forwarding a thread to `USERNAME+tickler+2pm@gmail.com` means "restore this thread to the inbox by 2pm at the latest; i.e., sometime in the hour preceding 2pm."

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

