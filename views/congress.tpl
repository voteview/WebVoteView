% STATIC_URL = "/static/"
% rebase('base.tpl', title='Congress View', extra_css=['map.css'])
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
					<option value="{{i}}">{{i}}th Congress</option>
				% end
				</select>
				 &gt; {{memberLabel}}
			</div>
			<div style="text-align:middle;padding-top:3px;">
				(Sort by
				<a href="#" onclick="javascript:resort('name');return false;">Name</a>, 
				<a href="#" onclick="javascript:resort('party');return false;">Party</a>, 
				<a href="#" onclick="javascript:resort('state');return false;">State</a>, 
				<a href="#" onclick="javascript:resort('elected');return false;">Seniority</a>)
			</div>
		</div>

		<!-- Nominate graph -->
		<!--<h4>DW-Nominate Plot
			<a href="#" onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'plot_{{memberLabel}}.png', {backgroundColor: 'white'});return false;">
				<img src="/static/img/save.png" style="margin-left:5px;width:22px;vertical-align:middle;" data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG">
			</a>
		</h4>

		<div id="scatter-container" style="margin:0 auto 0 auto;">
			<div id="scatter-bg">
				<svg id="svg-bg"></svg> 
			</div>
			<div id="scatter-chart">
			</div>
		</div>-->

		<div id="memberList" style="margin-bottom:40px;" class="clearfix">
		</div>
	</div>
</div>

<script language="javascript">
var chamber_param = "{{ chamber }}";
var congressNum = 114;
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/congress.js"></script>

