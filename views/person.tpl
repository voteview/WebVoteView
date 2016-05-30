% STATIC_URL = "/static/"
% rebase("base.tpl",title="Person details")
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
%	lifeString = "("+str(person["born"])+"- )"
% elif "died" in person:
%	lifeString = "(??-"+str(person["died"])+")"
% else:
%	lifeString = ""
% end
<div class="container">

    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" style="max-width:160px;">
        </div>
        <div class="col-md-9">
		<h2>
			{{ person["fname"] }} {{lifeString}}
		</h2>

            <h4>{{ person["partyname"] }}</h4>
            <h4>{{ person["stateName"] }}, {{ person["stateAbbr"] }}</h4>
	    <h4>{{ label }}
		% z = 0
		% for chunk in person["yearsOfService"]:
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
			% if alt["yearsOfService"][0][0]>=person["yearsOfService"][-1][1]:
			Subsequently served as 
			% elif alt["yearsOfService"][-1][1]<=person["yearsOfService"][0][0]:
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
	    % end
        </div>
    </div>
    <div class="row">
        <div class="col-md-9 col-md-offset-2">
            <h3>Vote history</h3>
                <table class="table table-hover dc-data-table">
                    <thead>
                    <tr class="header">
                        <th>Date</th>
                        <th>Description</th>
                        <th>Link</th>
                    </tr>
                    </thead>
                    % for vote in votes:
                        <tr>
                            <td>{{ vote["date"] }}</td>
                            <td>{{ vote["shortdescription"] }}</td>
                            <td><a class="btn btn-primary btn-sm" href="/rollcall/{{vote["id"]}}">See vote</a></td>
                        </tr>
                    % end
                </table>
            <nav>
            <ul class="pager">
                % if current_page_number != 1:
                    <li class="previous"><a href="?page={{ current_page_number-1 }}"><span aria-hidden="true">&larr;</span> Previous</a></li>
                % end

                    <li class="next"><a href="?page={{current_page_number+1 }}">Next <span aria-hidden="true">&rarr;</span></a></li>
            </ul>
            </nav>
        </div>
    </div>
</div>
