% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase("base.tpl",title=person["canonicalName"], extra_css=["map.css"])
% include('header.tpl')
% current_page_number = 1
% import datetime
% if len(person["yearsOfService"]) and person["yearsOfService"][-1][1]>datetime.datetime.now().year:
%	label = "Serving"
% else:
%	label = "Served"
% end
% if "born" in person and "died" in person:
% 	lifeString = "("+str(person["born"])+"-"+str(person["died"])+")"
% elif "born" in person and not "died" in person and person["born"]<1900:
%	lifeString = "("+str(person["born"])+"-??)"
% elif "born" in person and not "died" in person:
%	lifeString = "("+str(person["born"])+"-)"
% elif "died" in person:
%	lifeString = "(??-"+str(person["died"])+")"
% else:
%	lifeString = ""
% end
% plotIdeology=0
% if "nominate" in person and "oneDimNominate" in person["nominate"] and person["nominate"]["oneDimNominate"] is not None:
%	plotIdeology = 1
% end
% person["lastName"] = person["canonicalName"].split(",")[0].upper()[0]+person["canonicalName"].split(",")[0].lower()[1:]
<div class="container">

    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" style="max-width:160px;">
        </div>
        <div class="col-md-5">
		<h2 style="word-wrap:break-word;">
			{{ person["canonicalName"] }} {{lifeString}}
		</h2>

            <h4>
		<span id="partyname">
			<a href="/parties/{{person["party"]}}">{{ person["partyname"] }}</a>
		</span>
		% if person["stateName"]!="(President)":
		 of {{person["stateName"]}} <img src="/static/img/states/{{ person["stateAbbr"]}}.png" style="width:20px;vertical-align:middle;">
		% else:
		 , President of the United States <img src="/static/img/states/{{ person["stateAbbr"]}}.png" style="width:20px;vertical-align:middle;">
		% end
	    </h4>
		
	    <h4>{{ label }}
		% z = 0
		% for chunk in person["yearsOfService"]:
			% if chunk[1]>2016:
			% chunk[1] = "Present"
			% end
			% if z>0:
				, 
			% end
			{{chunk[0]}}-{{chunk[1]}}
			% z = z + 1
		% end
	    </h4>
	    % if "altPeople" in person and len(person["altPeople"]):
	    <h5>
		% k = 0
		% for alt in person["altPeople"]:
			% if alt["yearsOfService"][0][0]>=person["yearsOfService"][-1][0]:
			Subsequently served as 
			% elif alt["yearsOfService"][-1][1]<=person["yearsOfService"][0][1]:
			Previously served as 
			% end
			% if k>0:
				, 
			% end
	 	 	<a href="/person/{{ str(alt["icpsr"]).zfill(6) }}">{{ alt["partyname"] }}</a> (
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
	    % if "twitter" in person:
		<h5><img src="/static/img/twitter.png" title="Twitter:"> <a href="http://www.twitter.com/{{person["twitter"]}}" target="_blank">@{{person["twitter"]}}</a></h5>
	    % end
        </div>
	% if plotIdeology:
	<div class="col-md-4">
		<div id="nominateHist" class="dc-chart">
			<h5 style="padding-top:20px;padding-bottom:0px;">
				Ideology
				% if len(person["congressLabels"])>1:
					<select id="congSelector">
				% 	person["congressesOfService"].reverse()
				%	for congressRun in person["congressesOfService"]:
				%		for congress in range(congressRun[1], congressRun[0]-1, -1):
							<option value="{{congress}}">{{person["congressLabels"][congress]}}</option>
				% 		end
				% 	end
					</select>
				% end
				<small style="padding-left:10px;"><a href="#" onclick="javascript:viewAllCong();return false;">View all members</a></small>
			</h5>
		</div>
	</div>
	% end
    </div>
	% if "bio" in person:
	<div class="row">
		<div class="col-md-12">
			<h3>Biography</h3>
			{{ person["bio"] }}
			<br/><small><em>Courtesy of</em> <a href="http://bioguide.congress.gov/biosearch/biosearch.asp">Biographical Directory of the United States Congress</a></small>
		</div>
	</div>
	% end
    <div class="row">
        <div class="col-md-12">
            <h3>Selected Votes</h3>
                <table class="table table-hover dc-data-table">
                    <thead>
                    <tr class="header">
			<th width="9%" style="text-align:right;">Date</th>
                        <th width="71%">Description</th>
			<th width="3%">Member Vote</th>
			<th width="3%">Party Vote</th>
			<th width="3%" style="text-align:right;">Vote Prob.</th>
			<th width="7%" style="text-align:right;">Result</th>
                        <th width="3%">Graph</th>
                    </tr>
                    </thead>
		    % lastDate = "0000-00-00"
                    % for vote in votes:
                        <tr style="cursor:pointer;" onclick="javascript:window.location='/rollcall/{{vote["id"]}}';">
			    <td align="right">
				% if lastDate!=vote["date"]:
				{{vote["date"]}}
				% end
			    </td>
                            <td style="border-right:1px solid #dddddd;">
				% if "description" in vote and vote["description"] is not None and len(vote["description"]):
				{{ vote["description"] }}
				% elif "shortdescription" in vote and vote["shortdescription"] is not None and len(vote["shortdescription"]):
				{{ vote["shortdescription"] }}
				% elif "question" in vote and vote["question"] is not None and len(vote["question"]):
				{{ vote["question"] }}
				% else:
				{{rcSuffix(vote["congress"])}} Congress &gt; {{vote["chamber"]}} &gt; Vote {{vote["rollnumber"]}}
				% end
				% if "keyvote" in vote and len(vote["keyvote"]):
				<span class="btn btn-default btn-xs" aria-label="Key Vote" style="margin-left: 10px;" data-toggle="tooltip" data-placement="bottom" title="Vote classified as a 'Key Vote' by Congessional Quarterly.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
			    </td>
			    <td>{{vote["myVote"]}}</td>
			    <td>
				% if vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					<span style="color:red;">
				% end
				{{vote["partyLabelVote"]}}
				% if vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					</span>
				% end
			    </td>
			    <td align="right">
				% if "myProb" in vote:
					% if vote["myProb"]<25:
					<span style="color:red;">{{round(vote["myProb"])}}%</span>
					% else:
					{{vote["myProb"]}}
					%end
				% end
			    </td>
			    <td align="right">{{vote["yea"]}}-{{vote["nay"]}}</td>
                            <td>
				<a href="/rollcall/{{ vote["id"] }}"><img src="/static/img/graph.png" style="width:24px;margin-right:16px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>
			    </td>
                        </tr>
			% lastDate = vote["date"]
                    % end
                </table>
        </div>
    </div>
</div>
% if plotIdeology:
<script>
var mapParties=1;
% if person["chamber"]=="House":
	var chamber = "house";
% else:
	var chamber = "senate";
% end
var memberICPSR = {{person["icpsr"]}};
var congressNum = {{person["congress"]}};
var memberIdeal = {{person["nominate"]["oneDimNominate"]}};
var memberIdealBucket = Math.floor({{person["nominate"]["oneDimNominate"]}}*10);
var memberPartyName = "{{person["partyname"]}}";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/personIdeology.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
% end
