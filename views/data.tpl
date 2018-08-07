% rebase('base.tpl',title='Data')
% STATIC_URL = '/static/'
% include('header.tpl')
<div class="container">
  <div class="row">
    <div class="col-md-9">

	<h3>Realtime NOMINATE Ideology and Related Data</h3>
	<p>
		This section contains download links for NOMINATE scores and other data that we make available to the public, in addition to tutorial articles explaining how to generate popular ancillary data from our data exports. Please continue by choosing the data you wish to download.<br/><br/>

		For more information on how NOMINATE scores and other data are calculated, please see the <a href="/about">About</a> page.
	</p>

	<div class="panel panel-default">
	  <div class="panel-heading"><strong>Please cite the dataset as:</strong></div>
	    <div class="panel-body">Lewis, Jeffrey B., Keith Poole, Howard Rosenthal, Adam Boche, Aaron Rudkin, and Luke Sonnet ({{year}}). <em>Voteview: Congressional Roll-Call Votes Database</em>. https://voteview.com/</div>
	</div>
    </div>
  </div>
  <div class="row">
    <div class="col-md-4">
	<div class="form-inline">
	<label for="source">Data Type:</label> 
	<select name="source" id="source" onChange="javascript:updateDownloadLink();">
		<option value="members">Member Ideology</option>
		<option value="rollcalls">Congressional Votes</option>
		<option value="votes">Members' Votes</option>
		<option value="parties">Congressional Parties</option>
	</select>
	</div>
	<div class="form-inline">
	<label for="chamber">Chamber:</label>
	<select name="chamber" id="chamber" onChange="javascript:updateDownloadLink();">
		<option value="HS">Both (House and Senate)</option>
		<option value="S">Senate Only</option>
		<option value="H">House Only</option>
	</select>
	</div>
	<div class="form-inline">
	<label for="congress">Congress:</label> 
	<select name="congress" id="congress" onChange="javascript:updateDownloadLink();">
		<option value="all">All</option>
		% for i in xrange(maxCongress, 0, -1):
		% min_year = 1787 + (2 * i)
		% max_year = min_year + 2
		% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
		<option value="{{str(i).zfill(3)}}">{{rcSuffix(i)}} Congress ({{min_year}} - {{max_year}})</option>
		% end
	</select>
	</div>
	<div class="form-inline" style="padding-bottom:3px;">
	<label for="format">File Format:</label> 
	<select name="format" id="format" onChange="javascript:updateDownloadLink();">
		<option id="format_csv" value="csv">CSV (Recommended)</option>
		<option id="format_json" value="json">JSON (Web Developers)</option>
		<option id="format_dat" value="dat">DAT (Legacy, Not Recommended)</option>
		<option id="format_ord" style="display:none;" value="ord">ORD (Legacy, Not Recommended)</option>
	</select>
	</div>
	<a class="btn btn-primary" id="download_link" href="/static/data/out/members/HSall_members.csv">Download Data</a>
    </div>
    <div class="col-md-5">
	<div class="panel panel-default" id="data_download_container" style="display:none;">
		<div class="panel-heading" id="data_download_heading">Heading</div>
		<div class="panel-body" id="data_download_desc"></div>
	</div>	
    </div>
  </div>
  <div class="row">
    <div class="col-md-9">
	<h3>Ancillary Data and Analyses</h3>
	<p>
		We are pleased to present a collection of articles discussing data and analyses that make use of NOMINATE / voteview.com, along with the source code used to produce the analyses. We hope these will be of use to scholars, journalists, and students interested in producing analysis using our data:
	</p>

	% for article in articles:
	<p><a href="/articles/{{article["slug"]}}">{{article["title"]}}</a>: {{article["description"]}}</p>
	% end

	<p><a href="/static/db/current.zip" onClick="javascript:return confirm('Are you sure you wish to download our complete database?');">Complete database</a> (approx. 500MB zipped): We expect that most journalists, academics, and interested users should use the main data downloads listed above. However, for users interested in building a website based on Voteview.com data, we make available a complete dump of our MongoDB database. This release is updated weekly and is provided without warranty.</p>
	<p><a href="/past_data">Browse prior database releases</a>: We retain archival copies of our complete database release. We recommend users only use the most current version of our data. These archival releases may be missing new rollcall or member data, and may also be missing corrections made to existing data.</p>


	<h3><a href="https://github.com/voteview"><img style="height:24px; vertical-align:top;" src="{{ STATIC_URL }}/img/github.png"></a> VoteView on Github</h3>
	<p>
		Most of the code associated with our website is available through our <a href="https://github.com/voteview">GitHub Organization.

		<ul>
			<li><a href="https://github.com/voteview/WebVoteView">voteview.com site source</a></li>
			<li><a href="https://github.com/JeffreyBLewis/congressional-district-boundaries">Congressional District Boundaries JSON data</a></li>
			<li><a href="https://github.com/voteview/member_photos">Congressional member photos</a></li>
			<li><a href="https://github.com/voteview/Rvoteview">Rvoteview R Package</a></li>
			<li><a href="https://github.com/voteview/articles">Articles and tutorials</a></li>
		</ul>
	</p>
    </div>
  </div>
</div>
<br/><br/>

<script type="text/javascript" src="{{ STATIC_URL }}js/data.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/footerFixed.js"></script>
