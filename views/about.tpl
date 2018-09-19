% rebase('base.tpl',title='About us', extra_js=["https://www.google.com/recaptcha/api.js", "/static/js/contact.js"])
% import json
% authData = json.load(open("model/auth.json","r"))
% include('header.tpl')

<div class="container">
	<div class="row">
		<div class="col-md-9">
			<h3>About the project</h3>

			<p> 
				<strong>Voteview</strong> allows users to view every congressional roll call vote in American history 
				on a map of the United States and on a liberal-conservative ideological map including information 
				about the ideological positions of voting Senators and Representatives. The original <u title="The original Voteview derived from a simulation coded by Poole and Rosenthal in FORTRAN for the University of Pittsburgh Supercomputer Center. Voteview for DOS was coded in QuickBasic by Douglas Skiba.">Voteview of DOS</u> was
				developed by Keith T. Poole and Howard Rosenthal at Carnegie-Mellon University between 1989 and 1992. Poole and Rosenthal developed <u title="Boris Shor continued to develop Voteview for Windows as it progressed from Windows 3.1 to XP. While still available on the legacy site, Voteview for Windows is incompatible with more recent releases of Windows.">Voteview for Windows</u> in 1993 at Princeton University and that work was continued by Boris Shor. 
				The legacy version of the website is available at <a href="https://legacy.voteview.com">legacy.voteview.com</a>.
			</p>

			<p>
				The new voteview.com combines the visualizations provided by the now obsolete Voteview desktop system, 
				data and NOMINATE estimates provided by the old voteview.com web site, and up-to-date voting data 
				from the current Congress with new search, download and visualization functionality.
			</p>

			<p>
				Ideological positions are calculated using the <strong>DW-NOMINATE</strong> (<strong>D</strong>ynamic <strong>W</strong>eighted <strong>NOMINA</strong>l <strong>T</strong>hree-step <strong>E</strong>stimation).
				This procedure was developed by Poole and Rosenthal in the 1980s and is a "scaling procedure", representing
				legislators on a spatial map. In this sense, a spatial map is much like a road map--the closeness of two
				legislators on the map shows how similar their voting records are. Using this measure of distance, DW-NOMINATE
				is able to recover the "dimensions" that inform congressional voting behavior.
			</p>

			<p>
				The primary dimension through most of American history has been "liberal" vs. "conservative" 
				(also referred to as "left" vs. "right"). A second dimension picks up differences within the major political 
				parties over slavery, currency, nativism, civil rights, and lifestyle issues during periods of American history.
			</p>

			<p>
				The technical details of the DW-NOMINATE model can be found in Poole's <a href="https://www.cambridge.org/catalogue/catalogue.asp?isbn=9780521617475">Spatial Models of Parliamentary Voting</a>.  
				Poole and Rosenthal's <a href="http://www.transactionpub.com/title/Ideology-and-Congress-978-1-4128-0608-4.html">Ideology and Congress</a> 
				explores the nature of voting in Congress and the political history of the United States through the lens of 
				the ideological dimensions recovered by DW-NOMINATE and is a useful companion to this site.
			</p>

			<p>
				UCLA's Department of Political Science and Social Science Computing host and maintain NOMINATE score data and 
				voteview.com. We welcome feedback, questions, and media enquiries concerning this project.
			</p>

			<h3>Support</h3>

			<p>
				This project was made possible by support from <a href="http://www.hewlett.org">The William and Flora Hewlett Foundation</a> 
				(Grant #2016-3870), the  <a href="http://www.nsf.gov">National Science Foundation</a> (NSF-SBS-0611974), 
				UCLA Social Science Computing and the University of Georgia. Some
				<a href="https://github.com/voteview/WebVoteView/wiki/Colophon">open source components</a> used under license.
			</p>

			<h3>Project Staff</h3>
			<ul>
				<li>
					<strong>Project Lead:</strong>
					<p class="padded_left">
						<a href="http://www.polisci.ucla.edu/people/jeffrey-b-lewis">Jeffrey B. Lewis</a><br/>
						Professor, University of California Los Angeles
					</p>
				</li>
				<li>
					<strong>Directors Emeritus:</strong>
					<p class="padded_left">
						<a href="http://spia.uga.edu/faculty-member/keith-poole/">Keith T. Poole</a><br/>
						Philip H. Alston, Jr. Distinguished Professor, University of Georgia<br/>
						Professor Emeritus, University of California San Diego
					<p>
					<p class="padded_left">
						<a href="http://as.nyu.edu/politics/directory.howard-l-rosenthal.html">Howard Rosenthal</a><br/>
						Professor of Politics, New York University<br/>
						Roger Williams Straus Professor of Social Sciences, Emeritus, Princeton University.
					</p>
				</li>

				<li>
					<strong>Lead Database Developer, Voteview.com:</strong> 
					<a href="https://github.com/adamboche">Adam Boche</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Lead Developer, Voteview.com:</strong> 
					<a href="https://rudkin.ca/">Aaron Rudkin</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Lead Developer:</strong> 
					<a href="http://lukesonnet.github.io/">Luke Sonnet</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Past Contributors:</strong>
					Erik Hanson,
					<a href="https://gps.ucsd.edu/faculty-directory/felipe-nunes.html">Felipe Nunes</a>,
					<a href="http://fabiosouto.me/">Fabio Souto</a>
				</li>
			</ul>

			<h3>Update Newsletter</h3>

			<p>
				We recognize that some institutional users may wish to be contacted in advance of major changes. 
				If you would like to be informed of major updates (including deprecation of data sources, major 
				new data sources, or major changes to score calculation), please leave your email here. We 
				expect these updates will be no more than annual in frequency. Your email address is stored securely
				with our email contact provider, <a href="https://sendgrid.com">SendGrid.com</a>, will never be shared with
				any other third parties, and we will never contact you for any reason other than to announce major 
				changes to voteview.com. 
			</p>

			<form id="update-form">
				<div class="form-group row">
					<label for="update_email" class="col-sm-2 col-form-label">Email Address</label>
					<div class="col-sm-6"><input id="update_email" name="update_email" class="form-control" type="text" placeholder="e.g. example@email.com"></div>
				</div>
				<div class="form-group row">
					<label for="update_action" class="col-sm-2 col-form-label">Subscribe</label>
					<div class="col-sm-6">
						<select name="update_action" id="update_action" class="form-control">
							<option value="subscribe">Subscribe</option>
							<option value="unsubscribe">Unsubscribe</option>
						</select>
					</div>
				</div>
				<div class="form-group row" id="captcha_hide_submit">
					<div class="col-sm-8">
						<input class="btn btn-primary" type="submit" onclick="javascript: newsletterSignup(); return false;" />
						<img class="loading_logo_hide" src="/static/img/loading.gif">
					</div>
				</div>
			</form>

			<div id="result_newsletter"></div>

			<h3>Contact Us</h3>
			<form id="contact-form">
				<div class="form-group row">
					<label for="yourname" class="col-sm-2 col-form-label">Your Name</label>
					<div class="col-sm-6"><input id="yourname" name="yourname" class="form-control" type="text" placeholder="e.g. Keith Poole"></div>
				</div>
				<div class="form-group row">
					<label for="email" class="col-sm-2 col-form-label">Email Address</label>
					<div class="col-sm-6"><input id="email" name="email" class="form-control" type="text" placeholder="e.g. example@email.com"></div>
				</div>
				<div class="form-group row">
					<label for="title" class="col-sm-2 col-form-label">Subject</label>
					<div class="col-sm-6"><input id="title" type="text" name="title" class="form-control" placeholder="e.g. Question about VoteView.com"></div>
				</div>
				<div class="form-group row">
					<div class="col-sm-8">
						<textarea class="form-control" rows="10" name="body" placeholder="Type your message here. Please allow 10 days for a response."></textarea>
					</div>
				</div>

				<script>
					function showSubmit() { $("#captcha_hide_submit").slideDown(); $("#captcha_click").slideUp(); }
				</script>

				<div class="form-group row">
					<div id="captcha_click" class="col-sm-8">
						<div class="g-recaptcha" data-sitekey="{{authData["recaptchaPublic"]}}" data-callback="submitForm" data-size="invisible"></div>
					</div>
				</div>

				<div class="form-group row" id="captcha_hide_submit">
					<div class="col-sm-8">
						<input class="btn btn-primary" type="submit" onclick="javascript:showLoad(); grecaptcha.execute(); return false;" />
						<img class="loading_logo_hide" src="/static/img/loading.gif">
					</div>
				</div>
			</form>

			<div id="result_contact"></div>

		</div>
	</div>
</div>
<br/><br/><br/>
