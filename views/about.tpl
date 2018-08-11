% rebase('base.tpl',title='About us', extra_js=["https://www.google.com/recaptcha/api.js", "/static/js/contact.js"])
% import json
% authData = json.load(open("model/auth.json","r"))
% include('header.tpl')

<div class="container">
	<div class="row">
		<div class="col-md-9">
			<h3>About the project</h3>

			<p> <strong>Voteview</strong> allows users to view every congressional roll call vote in American
history on a map of the United States and on a liberal-conservative
ideological map including information about the ideological positions of
voting Senators and Representatives.  The original <span title="The original Voteview derived from a simulation coded by Poole and Rosenthal in FORTRAN for the University of Pittsburgh Supercomputer Center. Voteview for DOS was coded in QuickBasic by Douglas Skiba." style="text-decoration:underline">Voteview of DOS</span> was
developed by Keith T. Poole and Howard Rosenthal at Carnegie-Mellon
University between 1989 and 1992.  Poole and Rosenthal developed <span title="Boris Shor continued to develop Voteview for Windows as it progressed from Windows 3.1 to XP. While still available on the legacy site, Voteview for Windows is incompatible with more recent releases of Windows." style="text-decoration:underline">Voteview for Windows</span> in 1993 at Princeton University and that work was continued by Boris Shor. The legacy version of the website is available at <a href="https://legacy.voteview.com">legacy.voteview.com</a>.
<br/><br/>
The new voteview.com combines the visualizations provided by the now
obsolete Voteview desktop system, data and NOMINATE estimates provided
by the old voteview.com web site, and up-to-date voting data from the
current Congress with new search, download and visualization
functionality.<br/><br/>

Ideological positions are calculated using the <strong>DW-NOMINATE</strong>
(<strong>D</strong>ynamic <strong>W</strong>eighted <strong>NOMINA</strong>l <strong>T</strong>hree-step <strong>E</strong>stimation).
This procedure was developed by Poole and Rosenthal in the 1980s and is a "scaling procedure", representing
legislators on a spatial map. In this sense, a spatial map is much like a road map--the closeness of two
legislators on the map shows how similar their voting records are. Using this measure of distance, DW-NOMINATE
is able to recover the "dimensions" that inform congressional voting behavior.<br/><br/>

The primary dimension through most of American history has been "liberal" vs. "conservative" (also referred to as "left" vs. "right"). A second
dimension picks up differences within the major political parties over slavery, currency, nativism, civil rights,
and lifestyle issues during periods of American history.<br/><br/>

The technical details of the DW-NOMINATE model can be found in Poole's <a href="https://www.cambridge.org/catalogue/catalogue.asp?isbn=9780521617475">Spatial Models of Parliamentary Voting</a>.  Poole and Rosenthal's <a href="http://www.transactionpub.com/title/Ideology-and-Congress-978-1-4128-0608-4.html">Ideology and Congress</a> explores the nature of voting in Congress and the political history of the United States through the lens of the ideological dimensions recovered by DW-NOMINATE and is a useful companion to this site.<br/><br/>

UCLA's Department of Political Science and Social Science Computing host and maintain NOMINATE score data and voteview. We welcome feedback,
questions, and media enquiries concerning this project.

			</p>

			<h3>Support</h3>

			This project was made possibe by support from <a href="http://www.hewlett.org">The William and Flora Hewlett Foundation</a> (Grant #2016-3870), the  <a href="http://www.nsf.gov">National Science Foundation</a> (NSF-SBS-0611974), UCLA Social Science Computing and the University of Georgia. Some <a href="https://github.com/voteview/WebVoteView/wiki/Colophon">open source components</a> used under license.

			<h3>Project Staff</h3>
			<ul>
				<li>
					<strong>Project Lead:</strong>
					<p style="padding-left:50px;">
						<a href="http://www.polisci.ucla.edu/people/jeffrey-b-lewis">Jeffrey B. Lewis</a><br/>
						Professor, University of California Los Angeles
					</p>
				</li>
				<li>
					<strong>Directors Emeritus:</strong>
					<p style="padding-left:50px;">
						<a href="http://spia.uga.edu/faculty-member/keith-poole/">Keith T. Poole</a><br/>
						Philip H. Alston, Jr. Distinguished Professor, University of Georgia<br/>
						Professor Emeritus, University of California San Diego
					<p>
					<p style="padding-left:50px;">
						<a href="http://politics.as.nyu.edu/object/HowardRosenthal">Howard Rosenthal</a><br/>
						Professor of Politics, New York University<br/>
						Roger Williams Straus Professor of Social Sciences, Emeritus, Princeton University.
					</p>
				</li>

				<li>
					<strong>Lead Database Developer, Voteview.com:</strong> <a href="https://github.com/adamboche">Adam Boche</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Lead Developer, Voteview.com:</strong> <a href="https://rudkin.ca/">Aaron Rudkin</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Lead Developer:</strong> <a href="http://lukesonnet.github.io/">Luke Sonnet</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Past Contributors:</strong>
						Erik Hanson,
						<a href="https://gps.ucsd.edu/faculty-directory/felipe-nunes.html">Felipe Nunes</a>,
						<a href="http://fabiosouto.me/">Fabio Souto</a>
				</li>
			</ul>

			<h3>Contact Us</h3>
			<form id="contact-form">
				<p>
					Your Name: <input name="yourname" type="text" placeholder="e.g. Keith Poole" style="width:60%;">
				</p>
				<p>
					Your Email Address: <input name="email" type="text" placeholder="e.g. example@email.com" style="width:53%;">
				</p>
				<p>
					Subject: <input type="text" name="title" placeholder="e.g. Question about VoteView.com" style="width:63%;">
				</p>
				<textarea style="width:70%;height:250px;" name="body" placeholder="Type your message here. Please allow 10 days for a response."></textarea>
				<script>
					function showSubmit() { $("#captcha_hide_submit").slideDown(); $("#captcha_click").slideUp(); }
				</script>
				<div id="captcha_click">
					Before you contact us, please click the box below to verify you are human:
					<div class="g-recaptcha" data-sitekey="{{authData["recaptchaPublic"]}}" data-callback="showSubmit"></div>
				</div>
				<div id="captcha_hide_submit" style="display:block;">
					<input type="submit" onclick="javascript:submitForm(); return false;" />
				</div>
			</form>
			<div id="result" style="display:none;"></div>
			</small>

			<br/><br/><br/>
		</div>
	</div>
</div>
