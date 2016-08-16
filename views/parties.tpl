% STATIC_URL = "/static/"
% if len(partyNameFull):
%	partyNameFull = " > "+partyNameFull
% end
% rebase('base.tpl', title='Parties'+partyNameFull, extra_js=["/static/js/libs/bootstrap-slider.min.js"], extra_css=['map.css', 'bootstrap-slider.css'])
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

				% if party==328:
				<div class="alert alert-warning">
					<strong>Warning!</strong> "Independent" refers to representatives and senators who are not affiliated with a party, 
					rather than a political party called the "Independent Party". Estimates of median ideology of independents over 
					time are highly unstable and unreliable. Some independent representatives or senators may "caucus" (work with) 
					organized political parties, but Voteview.com does not maintain or display this information.
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
					<span id="playButton" style="cursor:pointer;"
						class="glyphicon glyphicon-play" onclick="javascript:playLoopInt();return false;"></span>
					<span id="pauseButton" style="cursor:pointer;display:none;" class="glyphicon glyphicon-pause" onclick="javascript:stopLoop();return false;"></span>
					<span id="playHint">Animate</span>
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

					<strong>Jump to Year:</strong><br/>
					<input type="text" id="yearNum" style="width:50px;">
					<input type="button" onClick="javascript:switchCongress($('#yearNum').val());" value="Switch"><br/><br/>

					<strong>Jump to Congress:</strong><br/>
					<input type="text" id="congNum" style="width:50px;">
					<input type="button" onClick="javascript:switchCongress($('#congNum').val());" value="Switch"><br/><br/>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="col-md-12">
				<h4><span class="pluralNoun"> {{ party }}</span> serving over time <small><a class="reset" href="javascript:timeChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				<div id="time-chart"></div>
			</div>
		</div>
	</div>
</div>

<script language="javascript">
	var party_param = "{{ party }}";
	var mapParties=1;
	% if congStart:
	var congressNum={{congStart}};
	% else:
	var congressNum=114;
	% end
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>
<!--<script type="text/javascript" src="{{ STATIC_URL }}js/libs/simple-statistics.min.js"></script> -->
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/party.js"></script>

