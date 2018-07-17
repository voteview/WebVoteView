% rebase('base.tpl',title='Data')
% import os
% STATIC_URL = '/static/'
% include('header.tpl')
<div class="container">
  <div class="row">
    <div class="col-md-9">

      <h3>Realtime NOMINATE Ideology and Related Data</h3>
      <p>
      This section contains .csv files that provide descriptive data as well as ideological data for congressional rollcalls, individual member votes, members of congress, and parties.
	You can find information such the descriptions of rollcalls, what proportion of voting members were correctly classified by the ideological cutting line for that rollcall, the ideological position of members of congress, and more.
      </p>
      <p>
      Both the rollcall data and the data on members are split into chambers and congresses, although you can select some combinations of the two to download.
The data on parties is a dataset with some metadata about all of the different parties as well as their average ideological position and membership size broken down by congress and chamber.
      </p>
      <p>
        You can see the <a href="/about">about</a> page for more information about NOMINATE.
      </p>
      <p>



<div class="panel panel-default">
  <div class="panel-heading"><strong>Please cite the dataset as:</strong></div>
    <div class="panel-body">Lewis, Jeffrey B., Keith Poole, Howard Rosenthal, Adam Boche, Aaron Rudkin, and Luke Sonnet (2017). <em>Voteview: Congressional Roll-Call Votes Database</em>. https://voteview.com/</div>
    </div>


    For information on the data files, please see the <a href="/static/docs/csv_docs.html">CSV data files documentation</a>.
      <p>
        <div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about congressional rollcalls</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl', file_types=['csv','dat', 'json'])
	    <div class="dataLink">
	      <a class="csv" id="rollcalls">Download</a>
	    </div>
	  </div>
	</div>
      </p>


      <p>
        <div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about votes members cast</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl', file_types=['csv','ord'])
	    <div class="dataLink">
	      <a class="csv" id="votes">Download</a>
	    </div>
	  </div>
	</div>
      </p>

      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about members of congress</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl', file_types=['csv','dat'])
	    <div class="dataLink">
	      <a class="csv" id="members">Download</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about political parties</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl', file_types=['csv'])
	    <div class="dataLink">
	      <a class="csv" id="parties">Download</a>
	    </div>
	  </div>
	</div>
      </p>


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

<script language="javascript">
  function setLink(aobj, chamber, congress, ftype) {
    var dtype = aobj.attr("id");
    var linkfolder = '/static/data/out/' + dtype + '/';
    var link = linkfolder + chamber+congress+'_' + dtype+ '.'+ftype;
    aobj.attr("href", link);
    aobj.attr("target", "_blank");
  }

  function padCongress(congress) {
    var congressPad = ('000'+congress).substring(congress.length);
    return congressPad;
  }

  $(document).ready(function(){
    $(".dataLink").each(function() {
      var chamber = $(this).parent().find("select[name='chamber']").find("option:selected").val();
      var congress = $(this).parent().find("select[name='congress']").find("option:selected").val();
      var filetype = $(this).parent().find("select[name='filetype']").find("option:selected").val();
      setLink($(this).find("a"), chamber, padCongress(congress), filetype);
    });

    $('.dataSelect').on('change', function(){
      var dcontent = $(this).closest("div.dataContent");

      var chamber = dcontent.find("select[name='chamber']").find("option:selected").val();
      var congress = dcontent.find("select[name='congress']").find("option:selected").val();
      var filetype = dcontent.find("select[name='filetype']").find("option:selected").val();

      setLink(dcontent.find("a"), chamber, padCongress(congress), filetype);
    });

    $(".dataHeader").click(function() {
      $(this).next(".dataContent").slideToggle("fast");
      return false;
    });

  });
</script>

<style>
div.dataLink,
div.dataLinkFixed {
  margin-left: 10px;
}
</style>

<script type="text/javascript" src="{{ STATIC_URL }}js/footerFixed.js"></script>
