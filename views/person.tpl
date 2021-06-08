% import datetime
% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% if isinstance(twitter_card, dict) and "title" in twitter_card:
% 	pageTitle = twitter_card["title"].replace("Voteview.com: ","")+": "+twitter_card["body"]
% else:
%	pageTitle = person["bioname"]
% end
% rebase("base.tpl",title=pageTitle, extra_js=["/static/js/libs/jquery.tablesorter.min.js"],extra_css=["map.css", "person.css"])
% include('header.tpl')
% import datetime
% orgMapping = {"cq": "Congressional Quarterly", "gov": "Congress.gov", "vv": "Voteview Staff"}
% district_class = "hide_district_c" if not "district_code" in person or person["district_code"] in [0, 98, 99] else "show_district_c"
<div class="container">
    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" class="memberBioImage">
        </div>
        <div class="col-md-5">
		<h2 class="bio">
			{{ person["bioname"] }} {{person["lifeString"]}}
		</h2>

            <h4>
		<span id="partyname"><a href="/parties/{{person["party_code"]}}">{{ person["party_noun"] }}</a></span>{{!person["stateText"]}}
	    </h4>

	    <h4 id="show_district" class="{{district_class}}">
		<span id="district_label">{{rcSuffix(person["district_code"])}} congressional district</span>
	    </h4>

	    % for serviceSet in ["Senate", "House"]:
		% if "yearsOfService"+serviceSet in person and len(person["yearsOfService"+serviceSet]):
	    <h4>
		% if person["yearsOfService"+serviceSet][-1][1] > datetime.datetime.now().year:
			Serving in {{serviceSet}}
		% else:
			Served in {{serviceSet}}
		% end

		% z = 0
		% for chunk in person["yearsOfService"+serviceSet]:
			% if chunk[1]>=datetime.datetime.now().year:
			% chunk[1] = "Present"
			% end
			% if z>0:
				, 
			% end
			{{chunk[0]}}-{{chunk[1]}}
			% z = z + 1
		% end
	    </h4>
		% end
	    % end
	    % if "altPeople" in person and len(person["altPeople"]):
	    <h5>
		% k = 0
		% for alt in person["altPeople"]:
			% if alt["yearsOfService"][0][0] >= person["yearsOfService"][-1][0]:
			Subsequently served 
			% elif alt["yearsOfService"][-1][1] <= person["yearsOfService"][0][1]:
			Previously served
			% end
			% if k>0:
				, 
			% end
			% out_label = "as a %s" % alt["party_noun"] if alt["party_code"] != person["party_code"] else "in the %s" % alt["chamber"] if alt["chamber"] in ["Senate", "House"] else "as President"
	 	 	<a href="/person/{{ str(alt["icpsr"]).zfill(6) }}">{{ out_label }}</a> (
			% z = 0
			% for chunk in alt["yearsOfService"]:
				% if z > 0:
					, 
				% end
				{{chunk[0]}}-{{chunk[1]}}
			% end
		 )
		% k = k + 1
		% end
	    </h5>
	    % end
	    % if "website" in person:
		<h5><a href="{{person["website"]}}" target="_blank">Official Website</a></h5>
	    % end
	    % if "twitter" in person and len(person["twitter"]):
		<h5><img src="/static/img/twitter.png" title="Twitter:"> <a href="http://www.twitter.com/{{person["twitter"]}}" target="_blank">@{{person["twitter"]}}</a></h5>
	    % end
        </div>
	<div class="col-md-5">
		<h5 class="congSelector">
			<select id="congSelector">
			% 	person["congressesOfService"].reverse()
			%	for congressRun in person["congressesOfService"]:
			%		for congress in range(congressRun[1], congressRun[0]-1, -1):
				<option value="{{congress}}">{{person["congressLabels"][congress]}}</option>
			% 		end
			% 	end
			</select>
			<small><a href="/congress/house" id="view_all_members">View all members</a></small>
		</h5>

		% if person["plotIdeology"]:
		<ul class="nav nav-tabs">
			<li role="presentation" class="active"><a href="#" data-toggle="ideologyHolder">Ideology</a></li>
			<li role="presentation"><a href="#" data-toggle="loyaltyTable">Attendance and Loyalty</a></li>
		</ul>
		% end

		<div id="ideologyHolder">
		% if person["plotIdeology"]:
		<div id="nominateHist" class="dc-chart">
			% if "total_number_of_votes" in person["nominate"] and person["nominate"]["total_number_of_votes"] < 100:
			<div class="alert alert-info" role="alert">
			<strong>Note:</strong> This member has cast relatively few votes and so their ideological score may be unstable or inaccurate. Members who have cast at least 100 votes have more reliable scores.
			</div>
			% end
		</div>
			
		% else:
		<div class="alert alert-info" role="alert">
			% if person["chamber"] != "President":
			<strong>Note:</strong> We can only calculate an ideological score for members who have completed a minimum number of rollcall votes.
			% else:
			<strong>Note:</strong> Data on presidential position-taking comes from CQ. CQ has not supplied us with a sufficient amount of data about {{person["bioname"]}} to calculate an ideological score.
			% end
		</div>
		% end

		</div>
		<div id="loyaltyTable" class="container">
		</div>
	</div>
    </div>
	% if "biography" in person:
	<div class="row">
		<div class="col-md-12">
			<h3 class="biography">Biography</h3>
			{{ !person["biography"] }}
			% if "bio_flag" in person:
			<br><small><em>Biographical text written by {{person["bio_flag"]}}</em></small>
			% elif not "bioguide_id" in person:
			<br/><small><em>Courtesy of</em> <a href="http://bioguide.congress.gov/biosearch/biosearch.asp">The Biographical Directory of the United States Congress</a></small>
			% else:
			<br/><small><em>Courtesy of</em> <a href="http://bioguide.congress.gov/scripts/biodisplay.pl?index={{person["bioguide_id"]}}">Biographical Directory of the United States Congress</a></small>
			% end
			% if "photo_source" in person and person["photo_source"] != "bio_guide":
			<br><small><em>Photo source:</em> {{person["photo_source"]}}</small>
			% end

		</div>
	</div>
	% end
	% if "biography" in person and "served_as_speaker" in person and person["served_as_speaker"] and person["chamber"] != "President":
	<div class="alert alert-warning">
		<strong>Notice:</strong> By custom, the Speaker of the House rarely votes. Votes for {{person["bioname"]}} may appear to be missing as a result.
	</div>
	% end
	% if person["chamber"] == "President" and person["plotIdeology"] and person["congress"] >= 114:
	<div class="alert alert-warning">
		<strong>Notice:</strong> Data about presidential positions comes from CQ Almanac. This data may not reflect recent votes, pending CQ's announcement of those votes.
	</div>			
	% end 
    <div class="row">
        <div class="col-md-12">
	    <form onsubmit="javascript:startNewSearch();return false;" class="form-horizontal">
	    <div id="search-container" class="personSearch">
		<h3 id="voteLabel" class="pull-left">Selected Votes</h3>

		<div class="input-group loadVotes">
			<div id="memberSearch" class="input-group-btn">
				<button type="button" 
					class="btn btn-primary hide_button_default" id="loadStash" 
					onClick="javascript:loadSavedVotes();return false;"
					data-toggle="tooltip" data-placement="top" title="Load Saved Votes into Search">
					<span class="glyphicon glyphicon-upload"></span>
				</button>
			</div>
			<input type="text" id="memberSearchBox" class="form-control">
			<div class="input-group-btn">
				<button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
			</div>
		</div>

		<span class="clearfix"></span>
	    </div>
	    </form>

		<div id="memberVotesTable">
		</div>
		<div class="pull-right">
			<a id="nextVotes" href="#" class="btn btn-block btn-primary btn-large" onClick="javascript:nextPageSearch();return false;">Next page</a> 
		</div>
		<div id="loadIndicator" class="member_vote_load">
			<img src="/static/img/loading.gif"> 
		</div>
        </div>
    </div>
</div>
<div class="row bottomPad"></div>
</div>

<script>
var memberICPSR = {{person["icpsr"]}};
var congressNum = {{person["congress"]}};
var globalNextId = 0;
</script>
% if person["plotIdeology"]:
<script>
var mapParties=1;
% if person["chamber"] == "House":
	var chamber = "house";
% else:
	var chamber = "senate";
% end
var chamberTrue = "{{person["chamber"]}}";
var numBins = 15; // This is actually multiplied by 2, so 15*2 = 30.
var memberLastName = "{{person["last_name"]}}";
var memberIdeal = {{person["nominate"]["dim1"]}};
var memberIdealBucket = Math.floor({{person["nominate"]["dim1"]}}*numBins);
var memberPartyName = "{{person["party_name"]}}";
var memberPartyCode = "{{person["party_code"]}}";
var memberNoun = "{{person["party_noun"]}}";
var memberVotes = {{person["nvotes_yea_nay"]}};
var memberLoyalty = 100 * (1 - {{person["nvotes_against_party"]}} / {{person["nvotes_yea_nay"]}});
var memberAttendance = 100 * ({{person["nvotes_yea_nay"]}} / ({{person["nvotes_yea_nay"]}} + {{person["nvotes_abs"]}}));
var partyLoyalty = {{person["party_loyalty"]}}
var globalLoyalty = {{person["global_loyalty"]}}
var partyColor = "{{person["party_color"]}}";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/personIdeology.js"></script>
% end
<script type="text/javascript" src="{{ STATIC_URL }}js/personVotes.js"></script>
