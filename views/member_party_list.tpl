% if len(result_members) or len(result_parties):
	<div class="row">

% for party in result_parties:
		<a href="/parties/{{party["id"]}}/{{party["seo_name"]}}" class="nohover">
		<div class="col-md-3 memberResultBox {{party["colorScheme"]}}">
			<div class="party_box">
				<strong>{{party["fullName"]}}</strong><br/>
				Active from {{party["min_year"]}} to {{party["max_year"]}}<br/>
			</div>
		</div>
		</a>
% end

% for member in result_members:
		<a href="/person/{{member["icpsr"]}}/{{member["seo_name"]}}" class="nohover">
		<div class="col-md-3 memberResultBox">
			<img class="bio member_image pull-left" src="/static/img/bios/{{member["bio_image"]}}" alt="" aria-hidden="true">
			<div class="member_bio">
				% if "bioname" in member and member["bioname"] is not None:
					<strong>{{member["bioname"]}}</strong> ({{member["party_name"][0:1]}})<br/>
				% end
				<img src="/static/img/states/{{member["state_abbrev"]}}.png" alt="" class="member_flag" /> {{member["state"]}}<br/>
				Elected {{member["min_elected"]}}
			</div>
		</div>
		</a>
% end

	</div><br/>
% end
