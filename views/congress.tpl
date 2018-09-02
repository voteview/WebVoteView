% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='Congress View', extra_css=['map.css', 'scatter.css'], extra_js=["/static/js/libs/saveSvgAsPng.js", "/static/js/libs/jquery.tablesorter.min.js", "/static/js/libs/localStorage.js"])
% include('header.tpl')

<div class="container">
	<div id="loading-container">
		<h3>Loading members</h3>
		<img src="{{ STATIC_URL }}img/loading.gif" />
	</div>

	<div id="content">
		<div class="row">
			<div class="col-md-12">
				<div id="header" class="congress_header">
					<div id="congress_selector">
						<select id="congSelector">
						% for i in range(maxCongress, 0, -1):
							<option value="{{i}}"{{!" SELECTED" if int(i) == int(congress) else ""}}>
								{{rcSuffix(i)}} Congress ({{1787 + (2 * i)}}-{{1789 + (2 * i)}})
							</option>
						% end
						</select>
						 &gt; 
						<abbr title="MemberType" id="memberLabel" onClick="javascript:rechamber();return false;">
							{{"Senators" if chamber.title() == "Senate" else "Representatives"}}
						</abbr>
					</div>
					<div id="partyComposition"></div>
				</div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<!-- Nominate graph -->
				% if not tabular_view:
				<h4>DW-Nominate Plot
				<span class="glyphicon glyphicon-save save_icon" 
					data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG"
					onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'plot_{{memberLabel}}_{{congress}}.png', {backgroundColor: 'white'}); return false;"
					></span>
				</h4>

				<div id="scatter-container">
					<div id="scatter-bg">
						<svg id="svg-bg"></svg> 
					</div>
					<div id="scatter-chart">
						<span id="suppressNominateControls"><span class="filter"></span></span>
					</div>
				</div>
				% end
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<div class="roster_header">
				<h4>Roster</h4>
				% if not tabular_view:
				(Sort by
				<a href="#" onclick="javascript:resort('name');return false;">Name</a>, 
				<a href="#" onclick="javascript:resort('party');return false;">Party</a>, 
				<a href="#" onclick="javascript:resort('state');return false;">State</a>, 
				<a href="#" onclick="javascript:resort('nominate');return false;">Ideology</a>,
				<a href="#" id="sortChamber" onclick="javascript:resort('elected_{{chamber.lower()}}');return false;">Seniority</a> -- <a href="/congress/{{chamber}}/{{congress}}/text" id="textLink">Tabular View</a>)
				<div id="filterName">
					Filter Name: <input id="filter_name" type="text" placeholder="Don Young" oninput="javascript:delay_filter(); return false;">
				</div>
				% else:
				(<a href="/congress/{{chamber}}/{{congress}}" id="graphicLink">Graphical List View</a>)
				% end
				</div>

			% if not tabular_view:
			<ul id="memberList" class="clearfix">
			</ul>
			% else:
			<div id="memberTextList">
			</div>
			% end

			</div>
		</div>
	</div>
</div>

<div id="selectionFilterBar">
	<strong>Selected:</strong>
	<span id="data-count"><span id="votertype"></span> with </span>
	<span id="nominate-chart-controls">NOMINATE scores within <span class="filter"></span>, </span>
	<span id="name-controls">names matching "<span class="filter"></span>"</span>
	<a class="reset" href="javascript:doFullFilterReset();">Remove Filter</a>
</div>
<img id="selectionFilterClose" onClick="javascript:doFullFilterReset();" src="/static/img/close.png">

<script language="javascript">
var chamber_param = "{{ chamber }}";
var chamber = "{{ chamber }}";
var congressNum = {{congress}};
var mapParties = 1;
var nomDWeight = {{dimweight}};
var nomBeta = {{ nomBeta }};
% if tabular_view:
var tabular_view = 1;
% else:
var tabular_view = 0;
% end
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/congress.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/memberTable.js"></script>

