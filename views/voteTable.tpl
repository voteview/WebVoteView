% orgMapping = {"CQ": "Congressional Quarterly", "Gov": "Congress.gov", "VV": "Voteview Staff"}
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])

% def fixVoteProb(prob):
% 	if int(round(prob))==100:
%		return ">99"
%	elif int(round(prob))<1:
%		return "<1"
%	else:
%		return int(round(prob))
%	end
% end

% if len(votes):
		% if not int(skip):
                <table class="table table-hover dc-data-table" id="voteDataTable">
			<thead>
				<tr class="header">
					<th width="9%" style="text-align:right;">Date</th>
                        		<th width="62%">Description</th>
					<th width="6%">Party Vote</th>
					<th width="6%">Memb. Vote</th>
					<th width="6%" style="text-align:center;">
					<span class="glyphicon glyphicon-question-sign"
						style="margin-left:0px;width:2px;vertical-align:middle;cursor:pointer;" 
						data-toggle="tooltip" data-position="bottom" data-html="true"
						title="<div align=&quot;left&quot; style=&quot;font-weight:normal;&quot;><strong><u>Vote Probability</u></strong><br/>This column represents how likely the member was to cast the vote that they ultimately did cast. Unlikely votes are colored red.<br/><br/>For members who abstained from voting, we show the probability they would have voted 'Yea' if they had voted, colored in grey.</div>">
					</span>
					<br>Vote Prob.</th>
					<th width="7%" style="text-align:right;">Result</th>
                        		<th width="4%"></th>
				</tr>
			</thead>
		% end
		    % lastDate = "0000-00-00"
                    % for vote in votes:
                        <tr style="cursor:pointer;" onclick="javascript:window.location='/rollcall/{{vote["id"]}}';">
			    <td align="right">
				% if lastDate!=vote["date"]:
				<span>{{vote["date"]}}</span>
				% else:
				<span style="display:none;">{{vote["date"]}}</span>
				% end
			    </td>
                            <td style="border-right:1px solid #dddddd;">
				%	voteFields = ["vote_desc", "vote_document_text", "description", "short_description", "vote_question", "question"]
				%	done=0
				%	for v in voteFields:
				%		if v in vote and vote[v] is not None and len(vote[v]):
							{{vote[v]}}
				%			done=1
				%		end
				%	end
				%	if done==0:
						{{rcSuffix(vote["congress"])}} Congress &gt {{vote["chamber"]}} &gt; Vote {{str(vote["rollnumber"])}}
				%	end

				% if "key_flags" in vote and len(vote["key_flags"]):
				<span class="btn btn-default btn-xs" 
					aria-label="Key Vote" style="margin-left: 10px;" data-toggle="tooltip" 
					data-placement="bottom" title="Vote classified as a 'Key Vote' by {{orgMapping[vote["key_flags"][0]]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
			    </td>
			    <td>{{vote["partyLabelVote"]}}</td>
			    <td>
				% if vote["partyLabelVote"]!="N/A" and vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					<span style="color:red;">{{vote["myVote"]}}
				% else:
					{{vote["myVote"]}}
				% end
			    </td>
			    <td align="right">
				% if "myProb" in vote:				 
					% if vote["myVote"]=="Abs":	  
					<span style="color:#b3b3b3;">{{fixVoteProb(vote["myProb"])}}%</span>
					% elif vote["myProb"]<25:
					<span style="color:red;">{{fixVoteProb(vote["myProb"])}}%</span>
					% else:
					{{fixVoteProb(vote["myProb"])}}%
					%end
				% end
			    </td>
			    <td align="right">{{vote["yea_count"]}}-{{vote["nay_count"]}}</td>
                            <td>
				<a href="/rollcall/{{ vote["id"] }}"><img src="/static/img/graph.png" style="width:24px;margin-right:16px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>
			    </td>
                        </tr>
			% lastDate = vote["date"]
                    % end
		% if not int(skip):
                </table>
		% end
% else:
	<h3>Member has not voted on any votes matching search terms.</h3>
% end
