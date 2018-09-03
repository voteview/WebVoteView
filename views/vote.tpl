% STATIC_URL = "/static/"
% rebase('base.tpl', title=plotTitle, extra_css=["map.css","scatter.css", "bootstrap-slider.css"], extra_js=["/static/js/libs/saveSvgAsPng.js", "/static/js/libs/bootstrap-slider.min.js", "/static/js/libs/sticky-kit.min.js", "/static/js/stateMeta.js"])
% include('header.tpl')

% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])

<div id="holdHatching">
</div>

<div class="container">
	% include("vote_metadata.tpl")

	<div class="row" id="loadBar">
		<div class="col-md-12">
			<h4>
				Loading graphics...
				<img src="/static/img/loading.gif" class="loading_throbber">
			</h4>
		</div>
	</div>

	<div class="row" id="errorContent">
		<div class="col-md-12">
			<h4>Error!</h4>
			<div class="errorMessage"></div>
		</div>
	</div>

	<div class="row loadedContent">
		<div class="col-md-9 geo_map">
			<div id="geoMap">
				<h4>
					Member Vote Map

					<span class="glyphicon glyphicon-save noprint"
					      onclick="javascript:resetZoom();saveSvgAsPng($('#map-chart > svg')[0],'vote_map_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;"
					      data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Map as PNG">
					</span>

					%if len(noteText):
						<img src="/static/img/help.png" class="noteText left-tooltip noprint" data-toggle="tooltip" data-position="bottom" data-html="true" title="{{ noteText }}">
					%end

				</h4>

				<span id="map-chart"> <!-- This span tells DC where to put the map -->
					<button id="zoomIn" class="glyphicon glyphicon-plus noprint" onClick="javascript:doZoom(1);return false;"></button>
					<button id="zoomOut" class="glyphicon glyphicon-minus noprint" onClick="javascript:doZoom(-1);return false;"></button>

					<input id="ex1" data-slider-id="panY" type="text" data-slider-min="0" data-slider-max="500" data-slider-step="1"
							data-slider-orientation="vertical" data-slider-tooltip="hide" data-slider-handle="custom">
					<input id="ex2" data-slider-id="panX" type="text" data-slider-min="0" data-slider-max="810"
							data-slider-step="1" data-slider-tooltip="hide" data-slider-handle="custom">
					<span id="suppressMapControls"><span class="filter"></span></span>
				</span>

				<div class="alert alert-info noprint" role="alert" id="warnParty"><!-- This div warns about party combining -->
					<strong>Note:</strong> This map combines minor parties to increase visual clarity.
					<a href="/rollcall/{{rollcall["id"]}}?mapParties=0">Click here to view all parties separately.</a>
				</div>
			</div> <!-- Outside the Geo map, still inside the first column of the first row -->

			<!-- Nominate graph -->
			<h4>Vote Ideological Breakdown
				<span class="glyphicon glyphicon-save noprint nominateSave"
					onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'dw_nominate_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;"
					data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG">
				</span>
			</h4>

			<div id="scatter-container">
				<div id="scatter-bg">
					<svg id="svg-bg"></svg>
				</div>
				<div id="scatter-chart">
					<span id="suppressNominateControls"><span class="filter"></span></span>
				</div>
			</div>

			<div class="alert alert-warning nominateExplainer">
				This chart describes how members voted on the rollcall. Members are placed according to their NOMINATE ideological scores. 
				A cutting line divides the vote into those expected to vote "Yea" and those expected to vote "Nay". The shaded heatmap reflects 
				the expected probability of voting "Yea". You can select points or regions to subset the members listed above and below.
			</div>
		</div> <!-- Outside the first column onto the second column (the vote table). -->


		<div class="col-md-2 noprint" id="vote_chart_float">
			<h4>Votes
				<a href="/api/download?rollcall_id={{rollcall["id"]}}">
					<span class="glyphicon glyphicon-save saveButton"
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as JSON.">
					</span>
				</a>
				<a href="/api/downloadXLS?ids={{rollcall["id"]}}">
					<img src="/static/img/xls.png" class="xlsButton"
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as XLS.">
				</a>
			</h4>
			<div id="party-chart">
				<span id="suppressVoteChartControls"><span class="filter"></span></span>
			</div>
		</div>
	</div>

	<div class="row voteRow loadedContent">
		<div class="col-md-12" id="voteBucket">
			<div>
				<div class="voteHeader">Votes</div>
				<div class="noprint sortHeader">
					(Sort by
					<a href="#" onclick="javascript:outVotes('party');return false;">Party</a>,
					<a href="#" onclick="javascript:outVotes('state');return false;">State</a>,
					<a href="#" onclick="javascript:outVotes('vote');return false;">Vote</a>,
					<a href="#" onclick="javascript:outVotes('x');return false;">Ideology</a>,
					<a href="#" onclick="javascript:outVotes('prob');return false;">Vote Probability</a>)
				</div>
			</div>
			<div id="voteList"></div>
		</div>
	</div>
</div>

<!-- The hidden filter bar code -->
<div id="selectionFilterBar">
	<strong>Selected:</strong>
	<span id="data-count"><span class="filter-count"></span> of <span class="total-count"></span> <span id="votertype"></span></span>
	<span id="map-chart-controls"> from <span class="filter"></span></span>
	<span id="vote-chart-controls"> including <span class="filter"></span></span>
	<span id="nominate-chart-controls"> with NOMINATE scores within <span class="filter"></span></span>.
	<span id="sparse-selection"></span>
	<a class="reset" href="javascript:doFullFilterReset();">Remove Filter</a>
</div>
<img id="selectionFilterClose" onClick="javacript:doFullFilterReset();" src="/static/img/close.png">

<script type="text/javascript">
// Pass these variables from server-side script to the JS that expects they are set.
var chamber = "{{ rollcall["chamber"] }}";
var congressNum = "{{ str(rollcall["congress"]).zfill(3) }}";
var rcID = "{{ rollcall["id"] }}";
var mapParties = {{ mapParties }};
var nomDWeight = {{ dimweight }};
var nomBeta = {{ nomBeta }};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/mapPanZoom.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteCharts.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteTable.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteFilterbar.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/nominateHeatMap.js"></script>
