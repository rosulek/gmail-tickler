gmail-tickler
=============

A tickler for Gmail (get emails out of your inbox until a specified date)!

By Mike Rosulek (rosulekm@eecs.oregonstate.edu)

Made available under the MIT license.

## Setup:

1. **Set up the script:**

    * Go to [drive.google.com](http://drive.google.com), and create a new spreadsheet, called "Tickler" or something.

    * In the "tools" menu of the spreadsheet, select "script editor".

    * Select "blank project", and paste in code from the `gmail-tickler.gs` file in this repository. You'll have to change the configuration options near the top of the script to reflect your email address. There are other options as well, documented there.

2. **Create the labels:** In the toolbar on the script editor is a dropdown where you can select a function to be executed. Select the "setup" function and press the play button. This will add the appropriate labels to your gmail. 

> *Note:* You'll have to authorize the spreadsheet to access your gmail at this point. And you'll have to refresh any gmail browser sessions to see the new labels, give them colors, etc.

3. **Set up a time-driven trigger** for processing of the tickler file:

    * In the "resources" menu of the script editor, select "current project's triggers".

    * Add a new trigger for the function called `processThreads`, to be time-driven whenever you like. I suggest an hourly trigger.

4. **Add a Gmail filter** to get messages into the tickler file. You should add a filter for the search query `to:USERNAME+tickler from:me`, to bypass the inbox and assign the `tickler` label to messages.

## Usage

From Gmail, forward a thread (or compose a new message) to the address `USERNAME+tickler+cmd@gmail.com`, where `USERNAME` is your normal Gmail username, and `cmd` specifies the date/time you want the thread to be restored to your inbox. (You can also include such an email address as a BCC.)

Some examples of date/time specifications:

* USERNAME+tickler+2days@gmail.com
* USERNAME+tickler+next+monday@gmail.com
* USERNAME+tickler+jul+17+11am@gmail.com
* USERNAME+tickler+tomorrow.5.pm@gmail.com
* USERNAME+tickler+in.4.weeks@gmail.com

The processing script will look for the *last* message in the thread that is addressed to `USERNAME+tickler+anything@gmail.com`. So the thread can continue after it is put in the tickler file, and you can change the restoration date by adding another message to the thread.

Relative dates like "5 days", "tomorrow", "in 3 years" are relative to the message within the thread that contains the command. They are not relative to the first or last message within the thread or anything like that.

If the processing script is unable to understand the date/time specification of a thread that has the `tickler` label, it will move that thread to the inbox, put the `tickler/error` label on it, and reply to the thread with an error message.

## Fine Print / Known Limitations

It might not work correctly when you have lots (hundreds? thousands?) of emails in your tickler. Google Apps scripts are throttled in ways I don't fully understand.

I also don't understand the granularity or reliability of time-triggered Google Apps scripts. Triggering this script every minute may or may not work. I have mine triggered every hour. I would not stake my life on the processing script being triggered at precise times (at the 1-minute level of granularity).

Tickled threads will be restored to the inbox on the first time the processing script runs **after the given date/time has passed.** So if you tickle an email until 11am Friday, and your processing script is triggered every hour, your email may not be restored until 11:27am Friday, or whenever the processing script happens to run.
