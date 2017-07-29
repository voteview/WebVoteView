% devserver=int(open("./server.txt","r").read().strip())

<div class="container">
  <div id="wbv-header" class="row">
    <div class="col-md-12">
      <ul class="nav nav-pills pull-right noprint">

        <li><a href="/">home</a></li>
        <li><a href="/">search</a></li>

        <li>
          <a data-toggle="dropdown" href="#">chamber</a>
            <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
            <li><a href="/congress/senate">Senate</a></li>
            <li><a href="/congress/house">House of Representatives</a></li>
            </ul>
        </li>

        <li><a href="/parties/all">party</a></li>

        <li><a href="/district">geography</a></li>   

        <!-- JBL: Hide the summary page until it does more useful stuff...  <li>
          <a data-toggle="dropdown" href="#">summary</a>
            <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
              <li><a href="/explore/senate">Senate votes</a></li>
              <li><a href="/explore/house">House votes</a></li>
            </ul>
        </li> -->

        <li><a href="/data">data</a></li>

        <li><a href="http://voteviewblog.com/" target="_blank">blog</a></li>

        <!--<li><a href="/research">research</a></li>-->

        <li><a href="/about">about</a></li>
	</li>
      </ul>

	<h1 id="brand">
		<span class="printOnly">UCLA Presents </span>
		% if devserver:
		<a href="/"><span style="background-color:red;color:yellow;">voteview.com beta DEV SERVER</span></a>
		% else:
		<a href="/">voteview.com</a> <small>beta</small>
		% end
	</h1>
    </div>
  </div>
</div>
