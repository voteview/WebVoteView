% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% plotTitle = "Plot Vote: "+rcSuffix(rollcall["congress"])+" Congress > "+rollcall["chamber"]+" > "+str(rollcall["rollnumber"])
% rebase('base.tpl',title=plotTitle, extra_css=["map.css","scatter.css", "bootstrap-slider.css"], extra_js=["/static/js/libs/saveSvgAsPng.js", "/static/js/libs/bootstrap-slider.min.js","/static/js/libs/sticky-kit.min.js", "/static/js/stateMeta.js"])
% include('header.tpl')
% notes = []
% if int(rollcall["congress"])<86:
%	notes.append("State Boundaries depicted are as of the "+rcSuffix(rollcall["congress"])+" Congress.")
% end
% if int(rollcall["congress"])<91 and rollcall["chamber"]=="House":
%	notes.append("Some states contain At-Large districts with more than one representative.")
% end
% if len(notes):
%	noteText = "<strong><u>NOTE</u></strong><br/><ul>"
%	for note in notes:
%		noteText += "<li>"+note+"</li>"
%	end
%	noteText += "</ul>"
% else:
% 	noteText = ""
% end

% orgMapping = {"CQ": "Congressional Quarterly", "GOV": "Congress.gov", "VV": "Voteview Staff"}

<div class="container">
	<div class="row">
		<div class="col-md-12">
			<h3>
				% if "key_flags" in rollcall and len(rollcall["key_flags"]):
				<span class="btn btn-default btn-lg" 
					style="margin-right:10px;" data-toggle="tooltip" data-placement="bottom" 
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["key_flags"][0]]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}</abbr>
			</h3>
			<p style="float:left;margin-right:20px;"><strong>Date:</strong> {{ rollcall["date"] }}</p>
			% if "yea" in rollcall and "nay" in rollcall:
			<p style="float:left;margin-right:20px;">
				<strong>Result:</strong> 
				{{ rollcall["yea"] }}-{{ rollcall["nay"] }}
				% if rollcall['vote_result']:
				 ({{ rollcall['vote_result']}})
				% end
			</p>
			% end
			% if "codes" in rollcall and ("Peltzman" in rollcall["codes"] or "Clausen" in rollcall["codes"]):
			<p style="float:left;margin-right:20px;"><strong>Vote Subject Matter:</strong>
			% if "Clausen" in rollcall["codes"]:
			{{ rollcall["codes"]["Clausen"][0] }}
			% if "Peltzman" in rollcall["codes"]:
			/ {{ rollcall["codes"]["Peltzman"][0] }}
			% end
			% end
			</p>
			% end
			% if "name" in sponsor:
			<p><strong>Sponsor:</strong> <a href="/person/{{sponsor["icpsr"]}}/{{sponsor["seo_name"]}}">{{sponsor["name"]}}</a></p>
			% end
			% if "question" in rollcall and rollcall["question"]:
			<p style="clear:both;"><strong>Question: </strong>{{ rollcall["question"] }}</p>
			% end
			<p style="clear:both;"><strong>Description: </strong>{{ rollcall["description"] }}</p>
		</div>
	</div>

	<div class="row" id="loadBar">
		<div class="col-md-12">
			<h4>
				Loading graphics...
				<img src="/static/img/loading.gif" style="margin-left:10px;width:24px;vertical-align:middle;">
			</h4>
		</div>
	</div>

	<div class="row" id="errorContent" style="display:none;">
		<div class="col-md-12">
			<h4>Error!</h4>
			<div class="errorMessage"></div>
		</div>
	</div>

	<div style="display:none;" id="loadedContent"> <!-- loadedContent ensures none of our plots appear until after the JSON load. -->
		<div class="row" style="margin-bottom: 20px; "> <!-- this row contains the bounding box for the scrolling vote table -->
			<div class="col-md-9" style="min-width: 800px; margin-right:35px;"> <!-- this is the left column containing the map and the NOMINATE graph -->
				<div id="geoMap" style="padding-bottom:40px;"> <!-- This div contains the map header and map -->
					<h4 style="float:left;clear:none;vertical-align:middle;">
						Map 
	
						<span class="glyphicon glyphicon-save noprint" style="margin-left:5px;font-size:18px;vertical-align:middle;cursor:pointer;"
						      onclick="javascript:resetZoom();saveSvgAsPng($('#map-chart > svg')[0],'vote_map_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;" 
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Map as PNG">
						</span>
	
						%if len(noteText):
							<img style="margin-left:5px;width:22px;vertical-align:middle;" src="/static/img/help.png" class="left-tooltip noprint" data-toggle="tooltip" data-position="bottom" data-html="true" title="{{ noteText }}">
						%end
	
					</h4>
					</span>
	
					<span id="map-chart" style="margin-top:10px; padding: 10px; vertical-align:bottom;"> <!-- This span tells DC where to put the map -->
						<button id="zoomIn" class="glyphicon glyphicon-plus noprint" style="position:absolute;left:25px;top:40px;width:30px;height:30px;" onClick="javascript:doZoom(1);return false;"></button>
						<button id="zoomOut" class="glyphicon glyphicon-minus noprint" style="position:absolute;left:25px;top:80px;width:30px;height:30px;" onClick="javascript:doZoom(-1);return false;"></button>
	
						<input id="ex1" data-slider-id="panY" type="text" data-slider-min="0" data-slider-max="500" data-slider-step="1"
								data-slider-orientation="vertical" data-slider-tooltip="hide" data-slider-handle="custom">
						<input id="ex2" data-slider-id="panX" type="text" data-slider-min="0" data-slider-max="890"
								data-slider-step="1" data-slider-tooltip="hide" data-slider-handle="custom">
						<span id="suppressMapControls" style="display:none;"><span class="filter"></span></span>
					</span>
					<div class="alert alert-info noprint" role="alert" id="warnParty" style="display:none;"> <!-- This div warns about party combining -->
						<strong>Note:</strong> This map combines minor parties to increase visual clarity. 
						<a href="/rollcall/{{rollcall["id"]}}?mapParties=0">Click here to view all parties separately.</a>
					</div>
				</div> <!-- Outside the Geo map, still inside the first column of the first row -->

				<!-- Nominate graph -->
				<h4>DW-Nominate Cutting Line
					<span class="glyphicon glyphicon-save noprint"
						onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'dw_nominate_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;"
						style="margin-left:5px;width:18px;vertical-align:middle;cursor:pointer;" 
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG">
					</span>
				</h4>

				<div id="scatter-container" style="margin:0 auto 0 auto;">
					<div id="scatter-bg">
						<svg id="svg-bg"></svg> 
					</div>
					<div id="scatter-chart">
						<span id="suppressNominateControls" style="display:none;"><span class="filter"></span></span>
					</div>
				</div>
			</div> <!-- Outside the first column onto the second column (the vote table). -->
			<div class="col-md-2 noprint" id="vote_chart_float" style="position:static"> 
				<h4>Votes
					<a href="/api/download?rollcall_id={{rollcall["id"]}}">
						<span class="glyphicon glyphicon-save"
							style="margin-left:5px;font-size:18px;vertical-align:middle;cursor:pointer;color:black;" 
							data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as JSON.">
						</span>
					</a>
					<a href="/api/downloadXLS?ids={{rollcall["id"]}}">
						<img src="/static/img/xls.png" 
							style="margin-left:5px;width:22px;vertical-align:middle;" 
							data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as XLS.">
					</a>
				</h4> 
				<div id="party-chart">
					<span id="suppressVoteChartControls" style="display:none;"><span class="filter"></span></span>
				</div>
			</div>
		</div>

		<div class="row" style="margin-bottom:50px;">
			<div class="col-md-12" id="voteBucket">
				<div>
					<div style="font-size:19px;float:left;padding-right:30px;text-align:middle;">Votes</div>
					<div style="text-align:middle;padding-top:3px;" class="noprint">
						(Sort by 
						<a href="#" onclick="javascript:outVotes('party');return false;">Party</a>, 
						<a href="#" onclick="javascript:outVotes('state');return false;">State</a>, 
						<a href="#" onclick="javascript:outVotes('vote');return false;">Vote</a>,
						<a href="#" onclick="javascript:outVotes('x');return false;">Ideology</a>,
						<a href="#" onclick="javascript:outVotes('prob');return false;">Vote Probability</a>)
					</div>
				</div>
				<div id="voteList" style="margin-top:15px; width:100%; min-width: 1100px;"></div>
			</div>
		</div>
	</div>
</div>

<!-- The hidden filter bar code -->
<div id="selectionFilterBar" style="display:none;">
	<strong>Selected:</strong> 
	<span id="data-count"><span class="filter-count"></span> of <span class="total-count"></span> <span id="votertype"></span></span>
	<span id="map-chart-controls" style="display:none;"> from <span class="filter"></span></span>
	<span id="vote-chart-controls" style="display:none;"> including <span class="filter"></span></span>
	<span id="nominate-chart-controls" style="display:none;"> with NOMINATE scores within <span class="filter"></span></em></span>. 
	<span id="sparse-selection" style="display:none;"></span>
	<a class="reset" href="javascript:doFullFilterReset();">Remove Filter</a>
</div>
<img id="selectionFilterClose" style="display:none;width:32px;cursor:pointer;" onClick="javacript:doFullFilterReset();" src="/static/img/close.png">

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
