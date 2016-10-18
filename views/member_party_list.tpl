% if len(resultMembers) or len(resultParties):
	<div class="row">

% def congressToYear(cong): 
% return 1787+(2*cong)
% end

% i=0
% for party in resultParties:
		<div class="col-md-3 memberResultBox {{party["colorScheme"]}}" onClick="javascript:window.location='/parties/{{party["id"]}}';">
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
% 	if "bioname" in member and len(member["bioname"])>20 and "(" in member["bioname"]:
%		member["bioname"] = member["bioname"].split(",")[0] + ", " + member["bioname"].split("(")[1].split(")")[0]
%	end
		<a href="/person/{{member["icpsr"]}}" class="nohover">
		<div class="col-md-3 memberResultBox">
			<img src="/static/img/bios/{{member["bioImg"]}}" style="width:80px;height:80px;padding-right:10px;vertical-align:middle;" class="pull-left">
			<div style="font-size:0.9em;vertical-align:middle;padding-top:5px;">
				% if "bioname" in member and member["bioname"] is not None:
					<strong>{{member["bioname"]}}</strong> ({{member["party_name"][0:1]}})<br/>
				% end
				<img src="/static/img/states/{{member["state_abbrev"]}}.png" style="width:20px;" /> {{member["state"].replace("(","").replace(")","")}}<br/>
				Elected {{member["minElected"]}}
			</div>
		</div>
		</a>
% i=i+1
% if i>=50:
% break
% end
% end
	</div><br/>
% end
