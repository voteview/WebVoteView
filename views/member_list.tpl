% if len(resultMembers):
	<div class="row">
% for member in resultMembers:
		<div class="col-md-3 memberResultBox" onClick="javascript:window.location='/person/{{member["icpsr"]}}';">
			<img src="/static/img/bios/{{member["bioImg"]}}" style="width:80px;height:80px;padding-right:20px;vertical-align:middle;" class="pull-left">
			<div style="font-size:0.9em;vertical-align:middle;padding-top:15px;">
				% if "bioName" in member and member["bioName"] is not None:
					<strong>{{member["bioName"]}}</strong> ({{member["partyname"][0:1]}})<br/>
				% elif "fname" in member and member["fname"] is not None:
					<strong>{{member["fname"]}}</strong><br/>
				% else:
					<strong>{{member["name"]}}</strong><br/>
				% end
				{{member["stateName"]}}<br/>
				<!--{{member["partyname"]}}--> Elected {{member["minElected"]}}
			</div>
		</div>
% end
	</div><br/>
% end
