	<div class="row">
		<div class="col-md-12">
			<div id="mainCarousel" class="carousel slide" data-ride="carousel" data-pause="hover" data-interval="8000">
				<!-- Indicator list -->
				<ol class="carousel-indicators">
					% for i in range(len(slides)):
					<li data-target="#mainCarousel" data-slide-to="{{i}}"{{!' class="active"' if (i == 0) else ""}}></li>
					% end
				</ol>

				<!-- Slides -->
				<div class="carousel-inner" role="listbox">
					% for i in range(len(slides)):
					<div class="item{{!" active" if (i == 0) else ""}}{{!" item_" + slides[i].get("mask") if "mask" in slides[i] else ""}}">
					% if "link" in slides[i]:
					<a href="{{slides[i]["link"]}}">
					% end

					% if "image" in slides[i]:
						<img src="/static/img/carousel/{{slides[i]["image"]}}" alt="{{slides[i].get("title", "")}}">
					% end
					% if "video" in slides[i]:
						<video autoplay loop muted aria-label="{{slides[i].get("title", "")}}"><source src="/static/img/carousel/{{slides[i]["video"]}}" type="video/mp4"></video>
					% end
						<div class="carousel-caption">
							<h3>{{slides[i]["title"]}}</h3>
							<p>{{slides[i]["caption"]}}</p>
						</div>
					% if "link" in slides[i]:
					</a>
					% end
					</div>

					% end
				</div>
			</div>
		</div>
	</div>
