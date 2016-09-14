% if len(resultMembers) or len(resultParties):
	<div class="row">

% def congressToYear(cong): 
% return 1787+(2*cong)
% end

% i=0
% for party in resultParties:
		<div class="col-md-3 memberResultBox" onClick="javascript:window.location='/parties/{{party["id"]}}';">
			% if "logo" in party or (party["id"]==100 or party["id"]==200):
			<img src="/static/img/parties/{{party["id"]}}.png" style="height:80px;padding-right:20px;vertical-align:middle;" class="pull-left">
			% end
			<div style="font-size:0.9em;vertical-align:middle;padding-top:15px;">
				<strong>{{party["fullName"]}}</strong><br/>
				Active from {{congressToYear(party["minCongress"])}} to {{congressToYear(party["maxCongress"])+1}}<br/>
			</div>
		</div>
% i=i+1
% if i>=4:
% break
% end
% end
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
% i=i+1
% if i>=8:
% break
% end
% end
	</div><br/>
% end
