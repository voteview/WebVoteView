% devserver=int(open("./server.txt","r").read().strip())

<div class="container">
  <div id="wbv-header" class="row">
    <div class="col-md-12">
      <ul class="nav nav-pills pull-right">
        <li><a href="/">search</a></li>
        <li>
          <a data-toggle="dropdown" href="#">explore</a>
            <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
	      <li><a href="/parties/all">Parties</a></li>
	      <li><a href="/congress/senate">Senators</a></li>
	      <li><a href="/congress/house">Representatives</a></li>
              <li><a href="/explore/senate">Senate Votes</a></li>
              <li><a href="/explore/house">House Votes</a></li>
            </ul>
        </li>
	<li><a href="http://voteviewblog.com/" target="_blank">blog</a></li>
        <li><a href="/data">data</a></li>
        <!--<li><a href="/research">research</a></li>-->
        <li><a href="/about">about</a></li>
      </ul>

	<h1 id="brand">
		% if devserver:
		<a href="/"><span style="background-color:red;color:yellow;">voteview.com beta DEV SERVER</span></a>
		% else:
		<a href="/">voteview.com</a> <small>beta</small>
		% end
	</h1>
    </div>
  </div>
</div>
