% if len(resultMembers):
	<div class="row">
% for member in resultMembers:
% 	if len(member["bioName"])>20 and "(" in member["bioName"]:
%		member["bioName"] = member["bioName"].split(",")[0] + ", " + member["bioName"].split("(")[1].split(")")[0]
%	end
		<div class="col-md-3 memberResultBox" onClick="javascript:window.location='/person/{{member["icpsr"]}}';">
			<img src="/static/img/bios/{{member["bioImg"]}}" style="width:80px;height:80px;padding-right:20px;vertical-align:middle;" class="pull-left">
			<div style="font-size:0.9em;vertical-align:middle;padding-top:15px;">
				% if "bioName" in member and member["bioName"] is not None:
					<strong>{{member["bioName"]}}</strong> ({{member["partyname"][0:1]}})<br/>
				% end
				<img src="/static/img/states/{{member["stateAbbr"]}}.png" style="width:20px;" /> {{member["stateName"].replace("(","").replace(")","")}}<br/>
				<!--{{member["partyname"]}}--> Elected {{member["minElected"]}}
			</div>
		</div>
% end
	</div><br/>
% end
