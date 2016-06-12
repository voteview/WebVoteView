% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='Congress View', extra_css=['map.css', 'scatter.css'])
% include('header.tpl')
% memberLabel = (chamber.title()=="Senate" and "Senators" or "Representatives")
<div class="container">
	<div id="loading-container">
		<h3>Loading members</h3>
		<img src="{{ STATIC_URL }}img/loading.gif" />
	</div>

	<div id="content">
		<div id="header" style="margin-bottom:30px;">
			<div style="font-size:19px;float:left;padding-right:30px;text-align:middle;">
				<select id="congSelector">
				% for i in range(114, 0, -1):
					% if int(i)==int(congress):
					<option value="{{i}}" SELECTED>{{rcSuffix(i)}} Congress</option>
					% else:
					<option value="{{i}}">{{rcSuffix(i)}} Congress</option>
					% end
				% end
				</select>
				 &gt; <abbr title="MemberType" id="memberLabel" onClick="javascript:rechamber();return false;">{{memberLabel}}</abbr>
			</div>
			<div style="text-align:middle;padding-top:3px;">
				(Sort by
				<a href="#" onclick="javascript:resort('name');return false;">Name</a>, 
				<a href="#" onclick="javascript:resort('party');return false;">Party</a>, 
				<a href="#" onclick="javascript:resort('state');return false;">State</a>, 
				<a href="#" onclick="javascript:resort('nominate');return false;">Ideology</a>,
				<a href="#" onclick="javascript:resort('elected');return false;">Seniority</a>)
			</div>
		</div>

		<h4>Roster</h4>
		<div id="memberList" style="margin-bottom:40px;" class="clearfix">
		</div>

		<!-- Nominate graph -->
		<h4>DW-Nominate Plot
			<a href="#" onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'plot_{{memberLabel}}.png', {backgroundColor: 'white'});return false;">
				<img src="/static/img/save.png" style="margin-left:5px;width:22px;vertical-align:middle;" data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG">
			</a>
		</h4>

		<div id="scatter-container" style="margin:0 auto 50px auto;">
			<div id="scatter-bg">
				<svg id="svg-bg"></svg> 
			</div>
			<div id="scatter-chart">
			</div>
		</div>


	</div>
</div>

<script language="javascript">
var chamber_param = "{{ chamber }}";
var congressNum = {{congress}};
var mapParties = 1;
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/congress.js"></script>

