% STATIC_URL = "/static/"
% rebase("base.tpl",title="Person details")
% include('header.tpl')
% current_page_number = 0
<div class="container">

    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" style="max-width:160px;">
        </div>
        <div class="col-md-9">
            <h2>{{ person["fname"] }}</h2>
            <h4>{{ person["partyname"] }}</h4>
            <h4>{{ person["stateName"] }}, {{ person["stateAbbr"] }}</h4>
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
                            <td>{{ vote.date }}</td>
                            <td>{{ vote.shortdescription }}</td>
                            <td><a class="btn btn-primary btn-sm" href="/rollcall/{{vote.id}}">See vote</a></td>
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
