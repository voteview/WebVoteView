% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='Congress View', extra_css=['map.css', 'scatter.css'], extra_js=["/static/js/libs/saveSvgAsPng.js", "/static/js/libs/jquery.tablesorter.min.js"])
% include('header.tpl')
% memberLabel = (chamber.title()=="Senate" and "Senators" or "Representatives")
<div class="container">
	<div id="loading-container">
		<h3>Loading members</h3>
		<img src="{{ STATIC_URL }}img/loading.gif" />
	</div>

	<div id="content">
		<div id="header" style="height:40px;">
			<div style="font-size:19px;float:left;padding-right:30px;text-align:middle;">
				<select id="congSelector">
				% for i in range(maxCongress, 0, -1):
				      	% yearLow = 1787+2*i
					% yearHigh = yearLow + 2
					% if int(i)==int(congress):
					<option value="{{i}}" SELECTED>{{rcSuffix(i)}} Congress ({{yearLow}}-{{yearHigh}})</option>
					% else:
					<option value="{{i}}">{{rcSuffix(i)}} Congress ({{yearLow}}-{{yearHigh}})</option>
					% end
				% end
				</select>
				 &gt; <abbr title="MemberType" id="memberLabel" onClick="javascript:rechamber();return false;">{{memberLabel}}</abbr>
			</div>
			<div style="float:right;padding-right:50px;" id="partyComposition">
			</div>
		</div>

		<!-- Nominate graph -->
		% if not tabular_view:
		<h4>DW-Nominate Plot
				<span class="glyphicon glyphicon-save" style="margin-left:5px;font-size:22px;vertical-align:middle;cursor:pointer" 
					data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG"
					onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'plot_{{memberLabel}}_{{congress}}.png', {backgroundColor: 'white'}); return false;"
					></span>
		</h4>

		<div id="scatter-container" style="margin:0 auto 10px auto;">
			<div id="scatter-bg">
				<svg id="svg-bg"></svg> 
			</div>
			<div id="scatter-chart">
			</div>
		</div>
		% end

		<div style="text-align:middle;padding-bottom:10px;">
			<h4 style="display:inline;">Roster</h4> 
			% if not tabular_view:
			(Sort by
			<a href="#" onclick="javascript:resort('name');return false;">Name</a>, 
			<a href="#" onclick="javascript:resort('party');return false;">Party</a>, 
			<a href="#" onclick="javascript:resort('state');return false;">State</a>, 
			<a href="#" onclick="javascript:resort('nominate');return false;">Ideology</a>,
			<a href="#" id="sortChamber" onclick="javascript:resort('elected_{{chamber.lower()}}');return false;">Seniority</a> -- <a href="/congress/{{chamber}}/text">Tabular View</a>)
			<div style="float:right;">
				Filter Name: <input id="filter_name" type="text" placeholder="Don Young" oninput="javascript:delay_filter(); return false;">
			</div>
			% else:
			(<a href="/congress/{{chamber}}">Graphical List View</a>)
			% end
		</div>
		% if not tabular_view:
		<ul id="memberList" style="columns:auto 4; list-style-type: none; overflow: auto; width:100%; margin-bottom:40px;" class="clearfix">
		</ul>
		% else:
		<div id="memberTextList" style="margin-bottom:40px;">
		</div>
		% end

	</div>
</div>

<script language="javascript">
var chamber_param = "{{ chamber }}";
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

