% rebase('base.tpl',title='Data')
% import os
% STATIC_URL = '/static/'
% include('header.tpl')
<div class="container">
  <div class="row">
    <div class="col-md-9">

	<h3>Realtime NOMINATE Ideology and Related Data</h3>
	<p>
		This section contains download links for NOMINATE scores and other data that we make available to the public, in addition to tutorial articles explaining how to generate popular ancillary data from our data exports. Please continue by choosing the data you wish to download.<br/><br/>

		For more information on how NOMINATE scores and other data are calculated, please see the <a href="/about">About</a> page.

<div class="panel panel-default">
  <div class="panel-heading"><strong>Please cite the dataset as:</strong></div>
    <div class="panel-body">Lewis, Jeffrey B., Keith Poole, Howard Rosenthal, Adam Boche, Aaron Rudkin, and Luke Sonnet ({{year}}). <em>Voteview: Congressional Roll-Call Votes Database</em>. https://voteview.com/</div>
</div>


<script>
</script>

<div class="container">
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
	<div class="form-inline">
	<label for="format">File Format:</label> 
	<select name="format" id="format" onChange="javascript:updateDownloadLink();">
		<option id="format_csv" value="csv">CSV (Recommended)</option>
		<option id="format_json" value="json">JSON (Web Developers)</option>
		<option id="format_dat" value="dat">DAT (Legacy, Not Recommended)</option>
		<option id="format_ord" style="display:none;" value="ord">ORD (Legacy, Not Recommended)</option>
	</select>
	</div>
	<br/>	
	<a id="download_link" href="/static/data/out/members/HSall_members.csv">Download Data</a>
</div>
<div class="col-md-5">
	<span id="data_download_desc">
	</span>
</div>
</div>
</div>

<h3>Ancillary Data and Analyses</h3>
      <p>
	We are pleased to present a collection of articles discussing data and analyses that make use of NOMINATE / voteview.com, along with the source code used to produce the analyses. We hope these will be of use to scholars, journalists, and students interested in producing analysis using our data:

	% for article in articles:
	<p><a href="/articles/{{article["slug"]}}">{{article["title"]}}</a>: {{article["description"]}}</p>
	% end
      </p>

      <h3>Complete Database</h3>
      <p>
	<a href="/static/db/current.zip">Complete database</a> (approx. 500MB zipped).<br/>
	Our database is available in MongoDB bson/json format. This release is updated weekly. For information about specific data fields in the database, see the <a href="/static/docs/members.csv">members data dictionary</a> and <a href="/static/docs/rollcalls.csv">rollcalls data dictionary</a>.
      </p>
      <p>
	<a href="/past_data">Browse prior database releases</a><br/>
	We retain a year worth of archival data online. Archival releases may be missing new rollcall or member data,
	and may also be missing corrections made to existing data.
      </p>
    </div>
  </div>
</div>

<script type="text/javascript" src="{{ STATIC_URL }}js/data.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/footerFixed.js"></script>
