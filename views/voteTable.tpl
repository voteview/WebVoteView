% orgMapping = {"cq": "Congressional Quarterly", "gov": "Congress.gov", "vv": "Voteview Staff"}
% if len(votes):
                <table class="table table-hover dc-data-table">
                    <thead>
                    <tr class="header">
			<th width="9%" style="text-align:right;">Date</th>
                        <th width="71%">Description</th>
			<th width="3%">Party Vote</th>
			<th width="3%">Member Vote</th>
			<th width="3%" style="text-align:center;">
				<span class="glyphicon glyphicon-question-sign"
						style="margin-left:0px;width:2px;vertical-align:middle;cursor:pointer;" 
						data-toggle="tooltip" data-position="bottom" title="Probablity of a Yea vote is given in grey for abstentions. Otherwise the number represents the probability of the vote they did cast, with unlikely votes in red.">
				</span>
			<br>Vote Prob.</th>
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
				<span class="btn btn-default btn-xs" 
					aria-label="Key Vote" style="margin-left: 10px;" data-toggle="tooltip" 
					data-placement="bottom" title="Vote classified as a 'Key Vote' by {{orgMapping[vote["keyvote"][0]]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
			    </td>
			    <td>{{vote["partyLabelVote"]}}</td>
			    <td>
				% if vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					<span style="color:red;">
				% end
				{{vote["myVote"]}}
				% if vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					</span>
				% end
			    </td>
			    <td align="right">
				% if "myProb" in vote:				 
					% if vote["myVote"]=="Abs":	  
					<span style="color:#b3b3b3;">{{int(round(vote["myProb"]))}}%</span>
					% elif vote["myProb"]<25:
					<span style="color:red;">{{int(round(vote["myProb"]))}}%</span>
					% else:
					{{int(round(vote["myProb"]))}}%
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
% else:
	<h3>No votes found.</h3>
% end
