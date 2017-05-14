% rebase('base.tpl',title='Data')
% import os
% STATIC_URL = '/static/'
<!-- Data.tpl: This should be the template for the page that lists all the different data files we're making available.
     Currently, all the templating stuff is wired up, but none of the data pages exist because we haven't downloaded them from Keith yet. -->

% include('header.tpl')
<div class="container">
  <div class="row">
    <div class="col-md-9">

      <h3>Realtime NOMINATE Ideology and Related Data</h3>
      <p>
      This section contains .csv files that provide descriptive data as well as ideological data for congressional rollcalls, members of congress, and parties. You can find information such the descriptions of rollcalls, what proportion of voting members were correctly classified by the ideological cutting line for that rollcall, the ideological position of members of congress, and more.
      </p>
      <p>
      Both the rollcall data and the data on members are split into chambers and congresses, although you can select some combinations of the two to download. The data on parties is a dataset with some metadata about all of the different parties as well as their average ideological position and membership size broken down by congress and chamber.
      </p>
      <p>
      You can see the <a href="about/">about</a> page for more information about NOMINATE and complete data documentation is forthcoming.
      </p>
      <p>
        <div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about congressional rollcalls (.csv)</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a class="csv" id="rollcall">Download</a>
	    </div>
	  </div>
	</div>
      </p>

      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about members of congress (.csv)</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a class="csv" id="member">Download</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Information about political parties (.csv)</h4></a>
	  <div class="dataContent" style="display:none;">
	    <div class="dataLinkFixed">
	      <a id="party" href="/static/data/csv/party/party_all.csv">Download for all Congresses and Chambers</a>
	    </div>
	  </div>
	</div>
      </p>
      <!--
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Party ideology and metadata</h4></a>
	  % include('data_dropdowns.tpl')
	  <div class="dataLink">
	    <a id="party">Download</a>
	  </div>
	</div>
      </p>
      --->
      <br>
      <h4>Legacy Voteview File Formats</h3>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h5>Legacy Rollcall Vote Matrices (.ORD files)</h5></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a class="ord" id="rcmat">Download</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h5>Legacy Rollcall Vote Matrices (.CSV files)</h5></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a class="ord" id="csv">Download</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h5>Legacy Rollcall Flatfiles (.DAT files)</h5></a>
	  <div class="dataContent" style="display:none;">
	    <div class="dataLinkFixed">
	      <a id="rcdat" href="/static/data/dat/rollcall_both_all.dat">Download for all Congresses and Chambers</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h5>Legacy Member Flatfiles (.DAT files)</h5></a>
	  <div class="dataContent" style="display:none;">
	    <div class="dataLinkFixed">
	      <a id="memberdat" href="/static/data/dat/member_both_all.dat">Download for all Congresses and Chambers</a>
	    </div>
	  </div>
	</div>
      </p>


      <h4>Extra Legacy Information</h4>
      <p>
	<a href="/static/data/other/codes.txt">Clausen, Peltzman, and Issue codes for 1<sup>st</sup> to 113<sup>th</sup> Congresses</a>
      </p>
      <br>
      <h3>Complete Database</h3>
      <p>
	<a href="/static/db/current.zip">Complete database</a> (approx. 100MB zipped).<br/>
	Our database is available in MongoDB bson/json format. This release is updated weekly.
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
  function setLink(aobj, chamber, congress, folder, ftype) {
    var dtype = aobj.attr("id");
    var linkfolder = '/static/data/'+folder+'/';
    if (folder == 'csv') {
       linkfolder += dtype+'/'+dtype+'_'
    }
    var link = linkfolder + chamber+'_'+congress+'.'+ftype;
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

      folder = $(this).find("a").attr("class");
      if ($(this).find("a").attr("id") == "csv")
      {
	ftype = "csv";
      } else
      {
	ftype = folder;
      }
      
      setLink($(this).find("a"), chamber, padCongress(congress), folder, ftype);
    });

    $('.dataSelect').on('change', function(){
      var dcontent = $(this).closest("div.dataContent");
      var chamber = dcontent.find("select[name='chamber']").find("option:selected").val();
      var congress = dcontent.find("select[name='congress']").find("option:selected").val();

      folder = dcontent.find("a").attr("class");
      if (dcontent.find("a").attr("id") == "csv")
      {
	ftype = "csv";
      } else
      {
	ftype = folder;
      }

      setLink(dcontent.find("a"), chamber, padCongress(congress), folder, ftype);
    });

    $(".dataHeader").click(function() {
      $(this).next(".dataContent").slideToggle("fast");
    });
  
  });
</script>

<style>
div.dataLink,
div.dataLinkFixed {
  margin-left: 10px;
}
</style>

<!-- INATE and metadata <
        <a href="dwnomin_CHOICES.htm">DW-NOMINATE Probabilities for Legislator Choices: 1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

        <a href="dw-nominate.htm">DW-NOMINATE Program With Examples</a><BR>

        <a href="cutting_line_angles.htm">Cutting Line Angle Files for the House and Senate
           1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

        <a href="Nokken-Poole.htm">One-Congress-at-a-Time DW-NOMINATE (Nokken-Poole) data
           for  the House and Senate
           1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

        <a href="Political_Polarization.asp">Political Polarization Measures:  1879 - 2012</a><BR>

        <a href="Party_Unity.htm">Party Unity Scores by Democrat and Republican Members:  1857 - 2012</a><BR>

        <a href="Party_Unity.htm">Party Unity Scores by Congress:  1879 - 2012</a><BR>

        <a href="winning_side.htm">
         Percent Voting on the Winning Side by Member -- Houses/Senates 1 - 112</a><BR>
-->

<script type="text/javascript" src="{{ STATIC_URL }}js/footerFixed.js"></script>
