% devserver=int(open("./server.txt","r").read().strip())

<div class="container">
  <div id="wbv-header" class="row">
    <div class="col-md-12">
      <ul class="nav nav-pills pull-right noprint">

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

        <li><a href="/data">data</a></li>

        <li><a href="/about">about</a></li>
	</li>
      </ul>

	<h1 id="brand">
		<span class="printOnly">UCLA Presents </span>
		% if devserver:
		<a href="/"><span class="dev_header">voteview.com beta DEV SERVER</span></a>
		% else:
		<a href="/">voteview.com</a> <small>beta</small>
		% end
	</h1>
    </div>
  </div>
</div>
