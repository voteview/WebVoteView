% setdefault(errorMessage, "Unknown error.")
% rebase("base.tpl",title="Error!")
% include("header.tpl")
<div class="container">
	<div class="row">
		<div class="col-md-12">
			<h3>Error!</h3>
			<p> {{ errorMessage }}</p>

			<p>If you believe you are seeing this page in error, please <a href="/about">contact us</a> for troubleshooting support.</p>
			<p><a href="javascript:history.go(-1);">Click here to go back to the last page you were on.</a></p>
		</div>
	</div>
</div>
