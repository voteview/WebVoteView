% STATIC_URL = "/static/"
% rebase('base.tpl', title='Parties > ' + party_name_full, extra_js=["/static/js/libs/bootstrap-slider.min.js", "/static/js/stateMeta.js"], extra_css=['map.css', 'bootstrap-slider.css'])
% include('header.tpl')
<div class="container">
	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" alt="" role="presentation" />
		</h3>
	</div>

	<div id="content" class="loadedContent">
		<div class="row">
			<div class="col-md-12">
				<h3>
					<abbr title="parties"><a href="/parties/all">Parties</a></abbr> &gt;
					<span class="fullName">Party {{ party }}</span>
				</h3>
			</div>
		</div>
		% if "party_description" in party_data:
		<div class="row">
			<div class="col-md-12">
				<div class="panel panel-primary">
					<div class="panel-heading">
						<strong>
							About {{"the " + party_name_full if party_name_full != "Independent" else "Independents"}}
						</strong>
					</div>
					<div class="panel-body"> {{!party_data["party_description"]}}</div>
				</div>
			</div>
		</div>
		% end

		% if party != 328:
		<div class="row">
			<div class="col-md-12">
				<h4>
					<span class="fullName">Party {{ party }}</span> ideology over time<small>
					<button type="button" class="reset reset_party link-button" onclick="javascript:dimChart.filterAll();dc.redrawAll();return false;">reset</button></small>
				</h4>
				<div id="dim-chart"></div>
			</div>
		</div>
		<div class="row">
			<div class="col-md-12">
				<h4>
					<span class="party_header"><span class="fullName">Party {{ party }}</span> geographic control over time</span>
					<span class="congressControl">
						<button type="button" id="playButton"
							class="glyphicon glyphicon-play" onclick="javascript:playLoopInt();return false;" aria-label="Play animation"></button>
						<button type="button" id="pauseButton" class="glyphicon glyphicon-pause" onclick="javascript:stopLoop();return false;" aria-label="Pause animation"></button>
						<span id="playHint">Animate</span>
					</span>
				</h4>
			</div>
		</div>
		<div class="row slide_party">
			<div class="col-md-12 full">
				<label for="partyMapSlider" class="visually-hidden">Congress year</label>
				<input id="partyMapSlider" class="slider" aria-label="Congress year">
			</div>
		</div>
		<div class="row map_row">
			<div class="col-md-10" id="party-map-chart"></div>
			<div class="col-md-2">
				<label for="chamberControlSelect"><strong>Filter: Chamber Control</strong></label><br/>
				<select id="chamberControlSelect" onChange="javascript:toggleMapSupport(this.options[this.selectedIndex].value);">
					<option value="both">Both</option>
					<option value="senate">Senate Only</option>
					<option value="house">House Only</option>
				</select><br/><br/>

				<span class="congressControl">
					<label for="yearNum"><strong>Jump to Year:</strong></label><br/>
					<input type="text" id="yearNum" inputmode="numeric">
					<input type="button" onClick="javascript:switchCongress($('#yearNum').val());" value="Switch" aria-label="Switch to Congress for the entered year"><br/><br/>

					<label for="congNum"><strong>Jump to Congress:</strong></label><br/>
					<input type="text" id="congNum" inputmode="numeric">
					<input type="button" onClick="javascript:switchCongress($('#congNum').val());" value="Switch" aria-label="Switch to entered Congress number"><br/><br/>
				</span>
			</div>
		</div>
		% end
		<div class="row">
			<div class="col-md-12">
				<h4><span class="pluralNoun"> {{ party }}</span> serving over time <small><button type="button" class="reset reset_party link-button" onclick="javascript:timeChart.filterAll();dc.redrawAll();return false;">reset</button></small></h4>
				<div id="time-chart"></div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<div class="roster_header">
				<h4>Roster</h4>
				(Sort by
				<button type="button" class="link-button" onclick="javascript:resort('name', ['name', 'state', 'chamber', 'elected']);return false;">Name</button>,
				<button type="button" class="link-button" onclick="javascript:resort('state', ['name', 'state', 'chamber', 'elected']);return false;">State</button>,
				<button type="button" class="link-button" onclick="javascript:resort('nominate', ['name', 'state', 'chamber', 'elected']);return false;">Ideology</button>,
				<button type="button" class="link-button" onclick="javascript:resort('elected', ['name', 'state', 'chamber', 'elected']);return false;">Seniority</button>)
				</div>

				<ul id="memberList" class="party_members clearfix"></ul>
			</div>
		</div>
	</div>
</div>

<script language="javascript">
	var party_param = "{{ party }}";
	var mapParties =1;
	var congressNum = {{cong_start}};
	var chamber_param = "both";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/party.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/memberTable.js"></script>
