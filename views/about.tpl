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
University between 1989 and 1992.  Poole and Rosenthal developed <span title="Boris Shor continued to develop Voteview for Windows as it progressed from Windows 3.1 to XP. While still available on the legacy site, Voteview for Windows is incompatible with more recent releases of Window" style="text-decoration:underline">Voteview for Windows</span> in 1993 at Princeton University and that work was continued by Boris Shor. The legacy version of the website is available at <a href="https://legacy.voteview.com">legacy.voteview.com</a>.
<br/><br/>
The new voteview.com combines the visualizations provided by the now
obsolete Voteview desktop system, data and NOMINATE estimates provided
by the old voteview.com web site, and uptodate voting data from the
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

<!--
Voteview was developed by Keith T. Poole and Howard Rosenthal at Carnegie-Mellon University 1989-1992. The original software was written in BASIC 7.1 for DOS. Later (1997 – 2001), the software was converted to Visual Basic. The aim of the software was to allow researchers to view every roll call vote in American history on a map of the United States and/or an ideology map from D-NOMINATE (Dynamic-NOMINAl-Three-step-Estimation).

D-NOMINATE was developed by Poole and Rosenthal 1986-88 and is a scaling procedure that represented legislators and roll call outcomes as points on an ideological map. These points form a spatial map that summarizes the roll calls. In this sense a spatial map is much like a road map. A spreadsheet that tabulates all the distances between every pair of sizable cities in the United States contains the same information as the corresponding map of the U.S. but the spreadsheet gives you no idea what the U.S. looks like. Much like a road map, a spatial map formed from roll calls gives us a way of visualizing the political world of a legislature. The closeness of two legislators on the map shows how similar their voting records are, and the distribution of legislators shows what the dimensions are. The primary dimension through most of American history has been left v. right or liberal v. conservative. A second dimension picks up differences within the two major political parties over slavery, currency, nativism, civil rights, and lifestyle issues. This implemention of voteview is based on the Visual Basic of voteview And uses CS DW-NOMINATE which is an improved versions of the original D-NOMINATE. All the functionality and more is included in this web-based version of voteview. For further information, see 
-->
			</p>
<h3>Support</h3>

This project was made possibe by support from <a href="http://www.hewlett.org">The William and Flora Hewlett Foundation</a> (Grant #2016-3870), the  <a href="http://www.nsf.gov">National Science Foundation</a> (NSF-SBS-0611974), UCLA Social Science Computing and the University of Georgia.

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
					<strong>Lead Developer, Voteview.com:</strong> Aaron Rudkin, University of California Los Angeles</li>
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
					Your Email Address: <input name="email" type="text" placeholder="example@email.com" style="width:53%;">
				</p>
				<p>
					Subject: <input type="text" name="title" placeholder="Question about VoteView.com" style="width:63%;">
				</p>
				<textarea style="width:70%;height:250px;" name="body" placeholder="Type your message here. Please allow 48-72 hours for a response."></textarea>
				<script>
					function showSubmit() { $("#captcha_hide_submit").slideDown(); $("#captcha_click").slideUp(); }
				</script>
				<div id="captcha_click">
					Before you contact us, please click the box below to verify you are human:
					<div class="g-recaptcha" data-sitekey="{{authData["recaptchaPublic"]}}" data-callback="showSubmit"></div>
				</div>
				<div id="captcha_hide_submit" style="display:none;">
					<input type="submit" onclick="javascript:submitForm(); return false;" />
				</div>
			</form>
			<div id="result" style="display:none;"></div>

			<br/>
			<h4>Licence and Code</h4>
			<small>		
			<p>VoteView code available on GitHub:</p>
			<ul>
				<li><a href="https://github.com/JeffreyBLewis/congressional-district-boundaries">Congressional District Boundaries JSON data</a></li>
				<li><a href="https://github.com/JeffreyBLewis/Rvoteview">Rvoteview R Package</a></li>
				<li><a href="https://github.com/JeffreyBLewis/WebVoteView">WebVoteView site source</a></li>
			</ul>

			<p>VoteView data:</p>
			<ul>
				<li><a href="/static/db/current.zip">Current (generated weekly) backup of complete VoteView database</a> (50-100MB, MongoDB bson and json format)</li>
				<li><a href="/static/db/">Older backup archives</a></li>
			</ul>

			<p>Some graphics used under license:</p>
			<ul>
				<li><a href="http://www.flaticon.com/packs/arrows-pack/">Freepik Arrows Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/packs/data-analytics">Freepik Data Analytics Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/file-format-collection">Freepik File Format Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/thin-line-ui">Eleonor Wang Thin UI Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/flat-lines-circled">Eleonor Wang Flat Lines Circled Pack</a></li>
				<li><a href="https://github.com/stevenrskelton/flag-icon">State Flags from flag-icon</a> by Steven Skelton</li>
			</ul>

			<p>External code libraries:</p>
			<ul>
				<li><a href="https://github.com/twbs/bootstrap">Bootstrap.js</a> by Twitter, Inc.</li>
				<li><a href="https://github.com/dc-js/dc.js">DC.js</a> by Stephen Levine</li>
				<li><a href="https://github.com/Caged/d3-tip">D3-tip</a> by Justin Palmer</li>
				<li><a href="https://github.com/jquery/jquery">jQuery</a> by jQuery Foundation</li>
				<li><a href="https://github.com/exupero/saveSvgAsPng">saveSvgAsPng</a> by Eric Shull</li>
				<li><a href="https://github.com/seiyria/bootstrap-slider">bootstrap-slider</a> by Kyle Kemp and Rohit Kalkur</li>
				<li><a href="https://github.com/js-cookie/js-cookie">js-cookie</a> by Klaus Hartl and Fagner Brack</li>
			</ul>
			</small>

			<br/><br/><br/>
		</div>		
	</div>
</div>
