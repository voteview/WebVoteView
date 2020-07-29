% if len(result_members) or len(result_parties):
	<div class="row">

% for party in result_parties:
		<div class="col-md-3 memberResultBox {{party["colorScheme"]}}" onClick="javascript:window.location='/parties/{{party["id"]}}/{{party["seo_name"]}}';">
			<div class="party_box">
				<strong>{{party["fullName"]}}</strong><br/>
				Active from {{party["min_year"]}} to {{party["max_year"]}}<br/>
			</div>
		</div>
% end

% for member in result_members:
		<a href="/person/{{member["icpsr"]}}/{{member["seo_name"]}}" class="nohover">
		<div class="col-md-3 memberResultBox">
			<img class="bio member_image pull-left" src="/static/img/bios/{{member["bioImg"]}}">
			<div class="member_bio">
				% if "bioname" in member and member["bioname"] is not None:
					<strong>{{member["bioname"]}}</strong> ({{member["party_name"][0:1]}})<br/>
				% end
				<img src="/static/img/states/{{member["state_abbrev"]}}.png" class="member_flag" /> {{member["state"]}}<br/>
				Elected {{member["minElected"]}}
			</div>
		</div>
		</a>
% end

	</div><br/>
% end
