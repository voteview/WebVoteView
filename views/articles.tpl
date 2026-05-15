% rebase('base.tpl', title=meta["title"], extra_css=["rmd_default.css"], extra_js=["/static/js/libs/sourcembed.js", "/static/js/libs/highlight.js"])
% from model.date_helper import format_article_date
% include('header.tpl')

<!-- from RMarkdown -->
<script type="text/javascript">
if (window.hljs) {
  hljs.configure({languages: []});
  hljs.initHighlightingOnLoad();
  if (document.readyState && document.readyState === "complete") {
    window.setTimeout(function() { hljs.initHighlighting(); }, 0);
  }
}
</script>
<!-- end from RMarkdown -->

<div class="container">
	<div class="row">
		<div class="col-md-9">
			% include("static/articles/" + slug + "/" + slug + ".html")
		</div>
	</div>
</div>

% original_date_fmt = format_article_date(meta.get("original_date", ""))
% if original_date_fmt:
<script>
(function() {
	var origDate = {{! repr(original_date_fmt) }};
	var dateEl = document.querySelector('h4.date');
	if (!dateEl) { return; }
	var updatedDate = (dateEl.textContent || '').trim();
	if (!updatedDate || updatedDate === origDate) {
		dateEl.textContent = 'Originally published: ' + origDate;
	} else {
		dateEl.innerHTML =
			'Originally published: ' + origDate +
			' &nbsp;&middot;&nbsp; Last updated: ' + updatedDate;
	}
})();
</script>
% end

<!-- From Rmarkdown defaults -->
<script>
// add bootstrap table styles to pandoc tables
function bootstrapStylePandocTables() {
  $('tr.header').parent('thead').parent('table').addClass('table table-condensed');
}
$(document).ready(function () {
  bootstrapStylePandocTables();
});


</script>

<!-- dynamically load mathjax for compatibility with self-contained -->
<script>
  (function () {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src  = "https://mathjax.rstudio.com/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
    document.getElementsByTagName("head")[0].appendChild(script);
  })();
</script>
<!-- End Rmarkdown defaults -->
