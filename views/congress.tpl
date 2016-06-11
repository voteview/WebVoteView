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
				<a href="#" onclick="javascript:resort('elected');return false;">Seniority</a>)
			</div>
		</div>
		<div id="memberList" style="margin-bottom:40px;" class="clearfix">
		</div>
	</div>
</div>

<script language="javascript">
var chamber_param = "{{ chamber }}";
var congressNum = 114;
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/congress.js"></script>

