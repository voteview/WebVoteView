% STATIC_URL = "/static/"
% rebase('base.tpl', title='Committee', extra_css=['map.css'], extra_js=[])
% include('header.tpl')
<div class="row">
	<div class="col-md-12">
		<div class="alert alert-info" role="alert">
			We are pleased to now track House and Senate committees and their members over time. We rely on the great work of David Cannon, Garison Nelson, Charles Stewart, and Jonathan Woon to provide this information for the 1st through the 105th congresses. We welcome your feedback, suggestions, and corrections.
		</div>
	</div>
</div>
<div class="container">

	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" alt="" role="presentation" />
		</h3>
	</div>

	<div id="content">
		<div class="row">
			<div class="col-md-12">
				<h3>
					<abbr title="Committees"><a href="/committees/all">Committees</a></abbr> &gt;
					<span id="committee-name">Loading...</span>
				</h3>
				<p class="committee-jurisdiction" id="committee-jurisdiction" style="color: #555; font-size: 0.95em; margin-top: 4px;"></p>
				<p class="committee-jurisdiction-source" id="committee-jurisdiction-source" style="font-size: 0.85em; margin-top: 0;"></p>
				<p id="name-variants" style="color: #595959;"></p>
				<div id="succession-links" style="color: #555;"></div>
			</div>
		</div>

		<div class="row pad_bottom">
			<div class="col-md-12">
				<h4>Ideology Over Time</h4>
				<div id="dim-chart"></div>
			</div>
		</div>

		<div class="row pad_bottom">
			<div class="col-md-12">
				<h4>Committee Size Over Time &nbsp;<img src="{{ STATIC_URL }}img/help.png" alt="Help: click a bar to focus the roster and ideology view on that Congress." class="noteText noprint" id="size-chart-help" style="width:16px;vertical-align:middle;cursor:default;" data-toggle="tooltip" data-placement="right" data-html="true" title="Click on a bar to focus the roster and ideology view on that Congress."></h4>
				<div id="size-chart"></div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<div class="roster_header">
				<h4>Roster</h4>
				<span id="roster-congress-label" style="color: #595959;"></span>
				<div id="roster-date-slider-container" style="margin: 10px 0; max-width: 600px;">
					<label for="roster-date-slider"><strong>Roster on date:</strong>
						<span id="roster-date-readout" style="margin-left: 8px;"></span>
					</label>
					<div id="roster-date-slider" style="margin: 8px 0;"></div>
					<button type="button" class="link-button" onclick="javascript:stepRosterDate(-1);return false;" aria-label="Previous change">&laquo; Prev change</button>
					<button type="button" class="link-button" onclick="javascript:stepRosterDate(1);return false;" aria-label="Next change">Next change &raquo;</button>
				</div>
				<br/>
				(Sort by
				<button type="button" class="link-button" onclick="javascript:resort('name');return false;">Name</button>,
				<button type="button" class="link-button" onclick="javascript:resort('state');return false;">State</button>,
				<button type="button" class="link-button" onclick="javascript:resort('nominate');return false;">Ideology</button>,
				<button type="button" class="link-button" onclick="javascript:resort('elected');return false;">Committee Rank</button>)
				</div>
				<ul id="memberList" class="party_members clearfix"></ul>
			</div>
		</div>
	</div>
</div>

<div id="committee-credit-content" style="display:none">
	<p>Committee assignments for the 1st to 105th Congresses are based on the following data collections:</p>
	<p>David Canon, Garrison Nelson, and Charles Stewart. <em>Historical Congressional Standing Committees, 1st to 79th Congresses, 1789&ndash;1947.</em></p>
	<p>Garrison Nelson. <em>Committees in the U.S. Congress, 1947&ndash;1992.</em></p>
	<p>Charles Stewart III and Jonathan Woon. <em>Congressional Committee Assignments, 103rd to 105th Congresses, 1993&ndash;1998.</em></p>
	<p>These datasets are available for download from Charles Stewart's Congressional Data <a href="https://web.mit.edu/cstewart/www/data/data_page.html" target="_blank">webpage</a>.</p>
</div>
<p style="text-align:right; margin-top:8px; padding-right:15px;">
	<small><button type="button" class="link-button" id="committee-credit-link">Data Credits</button></small>
</p>

<script language="javascript">
	$(document).ready(function() {
		$('#committee-credit-link').popover({
			html: true,
			trigger: 'manual',
			placement: 'top',
			container: 'body',
			content: function() { return $('#committee-credit-content').html(); }
		}).on('mouseenter', function() {
			var _this = this;
			$(this).popover('show');
			$('.popover').on('mouseleave', function() {
				$(_this).popover('hide');
			});
		}).on('mouseleave', function() {
			var _this = this;
			setTimeout(function() {
				if (!$('.popover:hover').length) {
					$(_this).popover('hide');
				}
			}, 100);
		});
	});

	var committee_param = "{{ committee }}";
	var mapParties = 1;
	var congressNum = {{cong_start}};
	var maxCongress = {{max_congress}};
	var chamber_param = "both";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/stateMeta.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/nouislider@15.7.1/dist/nouislider.min.css">
<script src="https://cdn.jsdelivr.net/npm/nouislider@15.7.1/dist/nouislider.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/committee.js"></script>
