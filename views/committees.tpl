% STATIC_URL = "/static/"
% rebase('base.tpl', title='Committee', extra_css=['map.css'], extra_js=[])
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
					<abbr title="Committees"><a href="/committees/all">Committees</a></abbr> &gt;
					<span id="committee-name">Loading...</span>
				</h3>
				<p id="name-variants" style="color: #888;"></p>
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
				<h4>Committee Size Over Time</h4>
				<div id="size-chart"></div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<div class="roster_header">
				<h4>Roster</h4>
				<span id="roster-congress-label" style="color: #888;"></span><br/>
				(Sort by
				<a href="#" onclick="javascript:resort('name');return false;">Name</a>,
				<a href="#" onclick="javascript:resort('state');return false;">State</a>,
				<a href="#" onclick="javascript:resort('nominate');return false;">Ideology</a>,
				<a href="#" onclick="javascript:resort('elected');return false;">Seniority</a>)
				</div>
				<ul id="memberList" class="party_members clearfix"></ul>
			</div>
		</div>
	</div>
</div>

<script language="javascript">
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
<script type="text/javascript" src="{{ STATIC_URL }}js/committee.js"></script>
