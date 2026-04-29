% from model.config import config
<div class="container">
  <div id="wbv-header" class="row">
    <div class="col-md-12">
      <nav aria-label="Primary" class="noprint">
      <ul class="nav nav-pills pull-right">

        <li><a href="/">search</a></li>

        <li class="dropdown">
          <a data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false" id="chamberDropdown">chamber <span class="caret" aria-hidden="true"></span></a>
            <ul class="dropdown-menu" aria-labelledby="chamberDropdown">
            <li><a href="/congress/senate">Senate</a></li>
            <li><a href="/congress/house">House of Representatives</a></li>
            </ul>
        </li>

        <li><a href="/parties/all">party</a></li>

        <li><a href="/committees/all">committee</a></li>

        <li><a href="/district">geography</a></li>

        <li><a href="/data">data</a></li>

        <li><a href="/about">about</a></li>
      </ul>
      </nav>

	<h1 id="brand">
		<span class="printOnly">UCLA Presents </span>
		% if config["server"]:
		<a href="/"><span class="dev_header">voteview.com beta 3 (isaac 1) in dev mode!</span></a>
		% else:
		<a href="/">voteview.com</a> <small>beta 3</small>
		% end
	</h1>
    </div>
  </div>
  % if config["transition_alert"]:
  <div class="row">
	<div class="col-md-12">
		<div class="alert alert-info" role="alert">
			<strong>Attention:</strong> During the transition to the new Congress, some data may be missing, incomplete, or provisional.
			We expect scores to propagate over the next 1-2 weeks. If you would like to be alerted when data for the new Congress is fully propagated, please <a href="https://vanguard.voteview.com/about">sign up for our update newsletter.</a>
		</div>
	</div>
  </div>
  % end
</div>

<!-- Anouncing the migration to Python 3 -->

<div class="row">
	<div class="col-md-12">
		<div class="alert alert-info" role="alert">
		     Welcome!  We have just updated Voteview's aging codebase.  In the process, we have fixed some nagging issues and
		     improved performance. If you notice anything that used to work that no longer does, please let us know.
		</div>
	</div>
</div>
