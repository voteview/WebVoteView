% rebase('base.tpl',title='Data')

<!-- Data.tpl: This should be the template for the page that lists all the different data files we're making available.
Currently, all the templating stuff is wired up, but none of the data pages exist because we haven't downloaded them from Keith yet. -->

% include('header.tpl')
<div class="container">
  <div class="row">
    <div class="col-md-9">

      <h3>NOMINATE and Related Data</h3>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Rollcall parameters and metadata</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a id="rollcall">Download</a>
	    </div>
	  </div>
	</div>
      </p>

      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Member ideal points and metadata</h4></a>
	  <div class="dataContent" style="display:none;">
	    % include('data_dropdowns.tpl')
	    <div class="dataLink">
	      <a id="member">Download</a>
	    </div>
	  </div>
	</div>
      </p>
      <p>
	<div class="dataContainer">
	  <a href="#" class="dataHeader"><h4>Party ideology and metadata</h4></a>
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
      <h3>Support Files</h3>
      <p>
	<a href="/static/data/codes.txt">Clausen, Peltzman, and Issue codes for 1<sup>st</sup> to 113<sup>th</sup> Congresses</a>
      </p>

      <h3>Complete Database</h3>
      <p>
	<a href="/static/db/current.zip">Complete database</a> (approx. 100MB zipped).<br/>
	Our database is available in MongoDB bson/json format. This release is updated weekly.
      </p>
      <p>
	<a href="/static/db/">Browse prior database releases</a><br/>
	We retain a year worth of archival data online. Archival releases may be missing new rollcall or member data,
	and may also be missing corrections made to existing data.
      </p>
    </div>
  </div>
</div>

<script language="javascript">
  function setLink(aobj, chamber, congress) {
    var dtype = aobj.attr("id");
    var link = '/static/data/csv/'+dtype+'/'+dtype+'_'+chamber+'_'+congress+'.csv';
    aobj.attr("href", link);
    aobj.attr("target", "_blank");
  }

  $(document).ready(function(){
    $(".dataLink").each(function() {
      var chamber = $(this).parent().find("select[name='chamber']").find("option:selected").val();
      var congress = $(this).parent().find("select[name='congress']").find("option:selected").val();
      
      setLink($(this).find("a"), chamber, congress);
    });

    $('.dataSelect').on('change', function(){
      var dcontent = $(this).closest("div.dataContent");
      var chamber = dcontent.find("select[name='chamber']").find("option:selected").val();
      var congress = dcontent.find("select[name='congress']").find("option:selected").val();

      setLink(dcontent.find("a"), chamber, congress);
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

