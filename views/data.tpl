% rebase('base.tpl',title='Data')
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])

<!-- Data.tpl: This should be the template for the page that lists all the different data files we're making available.
Currently, all the templating stuff is wired up, but none of the data pages exist because we haven't downloaded them from Keith yet. -->

% include('header.tpl')
<div class="container">
	<div class="row">
		<div class="col-md-9">

	<h3>NOMINATE and Related Data</h3>
            <p>
	    <div id="dataContainer">
		<a href="#" id="dataHeader"><h4>Rollcall parameters and metadata</h4></a>
		% include('data_dropdowns.tpl')
		<div style="margin-left:10px;">
		<a href="#" onClick="document.location.href=downloadData('rollcall');">Download</a>
		</div>
	    </div>

            <p>
	    <div id="dataContainer">
		<a href="#" id="dataHeader"><h4>Legislator ideal points and metadata</h4></a>
		% include('data_dropdowns.tpl')
		<div style="margin-left:10px;">
		<a href="#" onClick="document.location.href=downloadData('member');">Download</a>
		</div>
	    </div>

<!-- INATE and metadata <
    <a href="rank_orders_all_congresses.htm">Rank Orderings all Houses and Senates -- 1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

    <a href="dwnomin_joint_house_and_senate.htm">Common Space DW-NOMINATE Scores 1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

        <a href="dwnominate.asp">DW-NOMINATE Scores 1<sup>st</sup> to 112<sup>th</sup> Congresses</a><BR>

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

        <a href="pmediant.htm">Party and Chamber Medians, 1 - 112 Congresses (DW-NOMINATE
        Scores) </a><BR> -->
</p>

<!--<p>
	<a href="/static/data/codes.txt">Clausen, Peltzman, and Issue codes for 1<sup>st</sup> to 113<sup>th</sup> Congresses</a><BR>
</p>-->

			<h3>Complete Database</h3>
			<p>
				<a href="/static/db/current.zip">Complete database</a> (approx. 100MB zipped).<br/>
				Our database is available in MongoDB bson/json format. This release is updated weekly.
			<p>
			<p>
				<a href="/static/db/">Browse prior database releases</a><br/>
				We retain a year worth of archival data online. Archival releases may be missing new rollcall or member data,
				and may also be missing corrections made to existing data.
			</p>
		</div>
	</div>
</div>

<script language="javascript">
function downloadData (type) {
	congress = $("#congress").val();
	chamber = $("#chamber").val();
	return '/static/csv/' + type + '/' + type + '_' + chamber + '_' + congress + '.csv';
}
$(document).ready(function(){

    $("#dataContainer").on('click', '#dataHeader', function(){
        console.log("waiting");
	$(this).parent().find("#dataContent").slideToggle("fast");
    });
    
});
</script>