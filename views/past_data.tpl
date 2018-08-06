% rebase('base.tpl')
% include('header.tpl')
% STATIC_URL = 'static/'
% DATA_DIR = 'db/'

<div class="container">
	<div class="row">
		<div class="col-md-9">
			<h3>Past database versions</h3>
                        

<p>Voteview retains a version of the full database from each week of the past year. Please note that these files are not curated and may not reflect updates or corrections to the database.</p>
<p>
<ul>
  % for file_name in folder_files:
  <li><a href="/static/db/{{file_name}}">{{file_name}}</a></li>
  % end
</ul>
</p>


		</div>		
	</div>
</div>

