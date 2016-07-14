% rebase('base.tpl',title='About us', extra_js=["https://www.google.com/recaptcha/api.js", "/static/js/contact.js"])
% import json
% authData = json.load(open("model/auth.json","r"))
% include('header.tpl')

<div class="container">
	<div class="row">
		<div class="col-md-9">
			<h3>About the project</h3>
		
			<p> <strong>Voteview.com</strong> is a website
that allows users to view every congressional roll call vote in
American history on a map of the United States and on
liberal-conservative ideological map including information about the
ideological positions of voting Senators and
Representatives.<br/><br/>

The original version of Voteview was developed by Keith T. Poole and Howard Rosenthal 
at Carnegie-Mellon University from 1989-1992.<br/><br/>

Ideological positions are calculated using the <strong>DW-NOMINATE</strong>
(<strong>D</strong>ynamic (<strong>W</strong>eighted <strong>NOMINA</strong>l <strong>T</strong>hree-step <strong>E</strong>stimation).
This procedure was developed by Poole and Rosenthal in the 1980s and is a "scaling procedure", representing
legislators on a spatial map. In this sense, a spatial map is much like a road map--the closeness of two
legislators on the map shows how similar their voting records are. Using this measure of distance, D-NOMINATE
is able to recover the "dimensions" that inform congressional voting behaviour.<br/><br/>

The primary dimension through most of American history has been "liberal" vs. "conservative" (also referred as "left" vs. "right"). A second
dimension picks up differences within the major political parties over slavery, currency, nativism, civil rights,
and lifestyle issues during periods of American history.<br/><br/>

UCLA's Department of Political Science hosts and maintains NOMINATE score data and Voteview.com. We welcome feedback,
questions, and media enquiries concerning this project.

<!--
Voteview was developed by Keith T. Poole and Howard Rosenthal at Carnegie-Mellon University 1989-1992. The original software was written in BASIC 7.1 for DOS. Later (1997 – 2001), the software was converted to Visual Basic. The aim of the software was to allow researchers to view every roll call vote in American history on a map of the United States and/or an ideology map from D-NOMINATE (Dynamic-NOMINAl-Three-step-Estimation).

D-NOMINATE was developed by Poole and Rosenthal 1986-88 and is a scaling procedure that represented legislators and roll call outcomes as points on an ideological map. These points form a spatial map that summarizes the roll calls. In this sense a spatial map is much like a road map. A spreadsheet that tabulates all the distances between every pair of sizable cities in the United States contains the same information as the corresponding map of the U.S. but the spreadsheet gives you no idea what the U.S. looks like. Much like a road map, a spatial map formed from roll calls gives us a way of visualizing the political world of a legislature. The closeness of two legislators on the map shows how similar their voting records are, and the distribution of legislators shows what the dimensions are. The primary dimension through most of American history has been left v. right or liberal v. conservative. A second dimension picks up differences within the two major political parties over slavery, currency, nativism, civil rights, and lifestyle issues. This implemention of voteview is based on the Visual Basic of voteview And uses CS DW-NOMINATE which is an improved versions of the original D-NOMINATE. All the functionality and more is included in this web-based version of voteview. For further information, see 
-->
			</p>

			<h3>Project Staff</h3>
			<ul>
				<li>
					<strong>Project Lead:</strong>
					<p style="padding-left:50px;">
						<a href="http://www.polisci.ucla.edu/people/jeffrey-b-lewis">Jeffrey B. Lewis</a><br/>
						Professor and Chair, University of California Los Angeles
					</p>
				</li>
				<li>
					<strong>Directors Emeritus:</strong>
					<p style="padding-left:50px;">
						<a href="http://polisci.uga.edu/directory/faculty_staff/poole-keith">Keith T. Poole</a><br/>
						Philip H. Alston, Jr. Distinguished Professor, University of Georgia<br/>
						Professor Emeritus, University of California San Diego
					<p>
					<p style="padding-left:50px;">
						<a href="http://politics.as.nyu.edu/object/HowardRosenthal">Howard Rosenthal</a><br/>
						Professor of Politics, New York University
					</p>
				</li>
				
				<li>
					<strong>Lead Database Developer:</strong> <a href="https://github.com/adamboche">Adam Boche</a>, University of California Los Angeles
				</li>
				<li>
					<strong>Lead Developer, Voteview.com:</strong> Aaron Rudkin, University of California Los Angeles</li>
				<li>
					<strong>Lead Developer, RVoteView:</strong> <a href="http://lukesonnet.github.io/">Luke Sonnet</a>, University of California Los Angeles
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
