% STATIC_URL = "/static/"
% rebase("base.tpl", title="Search", extra_js=["/static/js/libs/bootstrap-slider.min.js", "/static/js/palette.js"], extra_css=["bootstrap-slider.css", "search.css"])
% include('header.tpl')
% setdefault('args',{})
% setdefault('search_string',"")


<div class="container">

  <h1>Analyze every roll-call vote in the history of Congress</h1>
				You have reached the <strong>beta version</strong> of the new Voteview,  a website that allows users to view every congressional roll call vote
				in American history on a map of the United States and on a liberal-conservative ideological map, including information about the ideological position of
				voting Senators and Representatives. For more information about Voteview and NOMINATE, click <a href="/about">here</a>. <strong>Academics interested in NOMINATE data can download it on our <a href="/data">data page</a>.</strong><br/><br/>

				Below, you can search every rollcall vote. By default, the most recent votes are shown below. Suggested searches will show up in the search bar and you can use the advanced search to change the conditions for your query. You can also check out the <a href="/district">history of your district</a> and see how <a href="/parties">political parties have evolved over time.</a>
				We are still working to get this site ready for the public and would love to hear
				your feedback which you can send on the <a href="/about">About</a> page.
			</div>
		</div>
	</div>

<div id="myCarousel" class="carousel slide" data-ride="carousel">
  <!-- Indicators -->
  <ol class="carousel-indicators">
    <li data-target="#myCarousel" data-slide-to="0" class="active"></li>
    <li data-target="#myCarousel" data-slide-to="1"></li>
    <li data-target="#myCarousel" data-slide-to="2"></li>
  </ol>

  <!-- Wrapper for slides -->
  <div class="carousel-inner">
    <div class="item active">
      <img src="../static/img/parties.png" alt="Parties" class="frontPageCarouselItemImg img-responsive center-block">
      <div class="carousel-caption">
        <h3>Parties</h3>
        <p>Parties in historical perspective</p>
      </div>
    </div>


       <div class="item frontPageCarouselItemImg">
    <a href="/congress/house">
         <img src="../static/img/house_map.png" alt="House vote map" class="frontPageCarouselItemImg img-responsive center-block">
      <div class="carousel-caption">
        <h3>House vote analysis</h3>
        <p>See how the House voted</p>
      </div>
          </a>
    </div>



    <div class="item frontPageCarouselItemImg">
          <a href="/congress/senate">    
         <img src="../static/img/senate_map.png" alt="Senate vote map" class="frontPageCarouselItemImg img-responsive center-block">
      <div class="carousel-caption">
        <h3>Senate vote analysis</h3>
        <p>See how the Senate voted</p>
      </div>
          </a>
    </div>

    

  </div>

  <!-- Left and right controls -->
  <a class="left carousel-control" href="#myCarousel" data-slide="prev">
    <span class="glyphicon glyphicon-chevron-left"></span>
    <span class="sr-only">Previous</span>
  </a>
  <a class="right carousel-control" href="#myCarousel" data-slide="next">
    <span class="glyphicon glyphicon-chevron-right"></span>
    <span class="sr-only">Next</span>
  </a>
</div>


<script type="text/javascript" src="{{ STATIC_URL }}js/footerFixed.js"></script>
