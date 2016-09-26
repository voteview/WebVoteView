% STATIC_URL = "/static/"
% if len(partyNameFull):
%	partyNameFull = " > "+partyNameFull
% end
% if party==328:
% 	indicator = "warning"
% else:
% 	indicator = "info"
% end

% rebase('base.tpl', title='Parties'+partyNameFull, extra_js=["/static/js/libs/bootstrap-slider.min.js", "/static/js/stateMeta.js"], extra_css=['map.css', 'bootstrap-slider.css'])
% include('header.tpl')
<div class="container">
	
	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" />
		</h3>
	</div>
	
	<div id="content">
		<div class="row">
			<div class="col-md-12">
				<h3>
					<abbr title="parties"><a href="/parties/all">Parties</a></abbr> &gt; 
					<span class="fullName">Party {{ party }}</span>
				</h3>

				% if "partyDesc" in partyData:
				<div class="alert alert-{{indicator}}">
					{{!partyData["partyDesc"]}}
				</div>
				% end

				<h4>
					Median <span class="fullName">Party {{ party }}</span> ideology over time<small><a class="reset" href="javascript:dimChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small>
				</h4>
				<div id="dim-chart"></div>
			</div>
		</div>
		<div class="row" style="padding-bottom:30px;">
			<div class="col-md-12">
				<h4>
					<span style="padding-right:20px;"><span class="fullName">Party {{ party }}</span> geographic control over time</span>
					<span class="congressControl">
						<span id="playButton" style="cursor:pointer;"
							class="glyphicon glyphicon-play" onclick="javascript:playLoopInt();return false;"></span>
						<span id="pauseButton" style="cursor:pointer;display:none;" class="glyphicon glyphicon-pause" onclick="javascript:stopLoop();return false;"></span>
						<span id="playHint">Animate</span>
					</span>
				</h4>
				<div class="full">
					<input class="slider">
				</div>
				<div style="float:left;" id="party-map-chart"></div>
				<div style="float:left;">
					<strong>Filter: Chamber Control</strong><br/>
					<select onChange="javascript:toggleMapSupport(this.options[this.selectedIndex].value);">
						<option value="both">Both</option>
						<option value="senate">Senate Only</option>
						<option value="house">House Only</option>
					</select><br/><br/>

					<span class="congressControl">
						<strong>Jump to Year:</strong><br/>
						<input type="text" id="yearNum" style="width:50px;">
						<input type="button" onClick="javascript:switchCongress($('#yearNum').val());" value="Switch"><br/><br/>
	
						<strong>Jump to Congress:</strong><br/>
						<input type="text" id="congNum" style="width:50px;">
						<input type="button" onClick="javascript:switchCongress($('#congNum').val());" value="Switch"><br/><br/>
					</span>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="col-md-12">
				<h4><span class="pluralNoun"> {{ party }}</span> serving over time <small><a class="reset" href="javascript:timeChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				<div id="time-chart"></div>
			</div>
		</div>

		<div style="text-align:middle;padding-bottom:10px;">
			<h4 style="display:inline;">Roster</h4> 
			(Sort by
			<a href="#" onclick="javascript:resort('name');return false;">Name</a>, 
			<a href="#" onclick="javascript:resort('state');return false;">State</a>, 
			<a href="#" onclick="javascript:resort('nominate');return false;">Ideology</a>,
			<a href="#" onclick="javascript:resort('elected');return false;">Seniority</a>)
		</div>
		<ul id="memberList" style="columns:auto 4; list-style-type: none; overflow: auto; width:100%; margin-bottom:40px;" class="clearfix">
		</ul>
	</div>
</div>

<script language="javascript">
	var party_param = "{{ party }}";
	var mapParties=1;
	var congressNum={{congStart}};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/party.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/memberTable.js"></script>
