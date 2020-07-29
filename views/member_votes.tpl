% orgMapping = {"cq": "Congressional Quarterly", "gov": "Congress.gov", "vv": "Voteview Staff", "wikipedia": "Wikipedia"}
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% import model.prep_votes
% if len(votes):
		% if not int(skip):
                <table class="table table-hover dc-data-table" id="voteDataTable">
			<thead>
				<tr class="header">
					<th width="9%" class="text_right">Date</th>
                        		<th width="62%" data-sorter="false">Description</th>
					<th width="6%">Party Vote</th>
					<th width="6%">Member Vote</th>
					<th width="6%" class="text_center">
					<span class="glyphicon glyphicon-question-sign prob_tutorial"
						data-toggle="tooltip" data-html="true" data-position="bottom"
						title="<div class=&quot;prob_tooltip&quot;><strong><u>Vote Probability</u></strong><br/>How likely the member was to cast the vote that they ultimately did cast. Unlikely votes are colored red.<br/><br/>For members who abstained from voting, we show the probability they would have voted with their party if they had voted, colored in grey.</div>">
					</span>
					<br>Vote Prob.</th>
					<th width="7%" class="text_right">Result</th>
                        		<th width="4%" data-sorter="false"></th>
				</tr>
			</thead>
		% end
		    % lastDate = "0000-00-00"
                    % for vote in votes:
                        <tr class="cursor" onclick="javascript:window.location='/rollcall/{{vote["id"]}}';">
			    <td align="right">
				% if lastDate != vote["date"]:
				<span>{{vote["date"]}}</span>
				% else:
				<span class="hide_date">{{vote["date"]}}</span>
				% end
			    </td>
                            <td class="vote_text_cell">
				%	if "bill_number" in vote:
					<strong>{{vote["bill_number"]}}</strong><br/>
				%	end
				%	voteFields = ["vote_description", "vote_desc", "vote_document_text", "vote_title", "vote_question_text", "amendment_author", "description", "short_description"]
				%	done = 0
				%	for v in voteFields:
				%		if v in vote and vote[v] is not None and len(vote[v]):
							{{model.prep_votes.fix_punctuation(vote[v])}}
				%			done = 1
				%			break
				%		end
				%	end
				%	if done == 0:
						{{rcSuffix(vote["congress"])}} Congress &gt {{vote["chamber"]}} &gt; Vote {{str(vote["rollnumber"])}}
				%	end

				%	voteFieldsQ = ["vote_question", "question"]
				%	for v in voteFieldsQ:
				%		if v in vote and vote[v] is not None and len(vote[v]):
							<em>{{vote[v]}}</em>
				%			break
				%		end
				%	end
				% if "key_flags" in vote and len(vote["key_flags"]):
				<span class="btn btn-default btn-xs vote_button"
					aria-label="Key Vote" data-toggle="tooltip"
					data-placement="bottom" title="Vote classified as a 'Key Vote' by {{orgMapping[vote["key_flags"][0].lower()]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				% if "sponsor" in vote and vote["sponsor"]==person["icpsr"]:
				<span class="btn btn-default btn-xs vote_button"
					aria-label="Sponsor" data-toggle="tooltip"
					data-placement="bottom" title="This person sponsored the bill being voted on.">
					<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span> Sponsor
				</span>
				% end
			    </td>
			    <td>{{vote["partyLabelVote"]}}</td>
			    <td>
				% if vote["partyLabelVote"]!="N/A" and vote["partyLabelVote"]!="Tie" and vote["myVote"]!="Abs" and vote["myVote"]!=vote["partyLabelVote"]:
					<span class="unlikely_vote">{{vote["myVote"]}}</span>
				% else:
					{{vote["myVote"]}}
				% end
			    </td>
			    % if not "myProb" in vote:
			    %	imputed = "0000"
			    % elif vote["myVote"] == "Abs":
			    % 	imputed = "0" + str(vote["myProb"]).zfill(3)
			    % else:
			    % 	imputed = "1" + str(vote["myProb"]).zfill(3)
			    % end
			    <td align="right" data-impute-sort="{{imputed}}">
				% if "myProb" in vote:
					% if vote["myVote"] == "Abs":
					<span class="abstention">{{model.prep_votes.fix_vote_probability(vote["myProb"])}}%</span>
					% elif vote["myProb"] < 25:
					<span class="unlikely_vote">{{model.prep_votes.fix_vote_probability(vote["myProb"])}}%</span>
					% else:
					{{model.prep_votes.fix_vote_probability(vote["myProb"])}}%
					%end
				% end
			    </td>
			    <td align="right">{{vote["yea_count"]}}-{{vote["nay_count"]}}</td>
                            <td>
				<a href="/rollcall/{{ vote["id"] }}"><img src="/static/img/graph.png" class="viewVote" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>
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
