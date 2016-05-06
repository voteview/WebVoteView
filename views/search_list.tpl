  {% block results%}
	% for rollcall in rollcalls:
            <div class="panel panel-default">
              <div class="panel-heading"><strong><abbr title="Chamber">{{ rollcall.chamber }}</abbr>/<abbr title="Session">{{ rollcall.session }}</abbr>/<abbr title="Rollnumber">{{ rollcall.rollnumber }}</abbr> </strong> on {{ rollcall.date }}
               <span class="pull-right"><input type="checkbox" name="rollcall" value="{{ rollcall.id }}"> Add to excel</span>
              </div>
              <div class="panel-body">
              <p><strong>Clausen:</strong> {{ rollcall.code.Clausen.0 }} <strong>Peltzman:</strong> {{ rollcall.code.Peltzman.0 }}</p>
            <p>{{ rollcall.description|truncatewords:50 }}</p>
            <a href="./rollcall/{{rollcall.id}}" class="btn btn-primary pull-right">See vote</a>
              </div>
            </div>            
	% end

      {% empty %}
          <h2>No rollcalls with those parameters found</h2>
      {% endfor %}
  {% endblock %}
