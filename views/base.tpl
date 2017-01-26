% devserver=int(open("./server.txt","r").read().strip())
% STATIC_URL = "/static/"
% setdefault('title','UCLA')
% setdefault('extra_css','')
% setdefault('extra_js', '')
% setdefault('body_id', '')
% setdefault('body_class', '')
% setdefault('twitter_card', '')
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Voteview | {{ title }}</title>

        <meta http-equiv="X-UA-Compatible" content="chrome=IE7" />

        <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
	<meta name="description" content="View, map, and investigate congressional votes throughout history, classify legislators as liberal or conservatives." />
	% if devserver:
	<meta name=”robots” content=”noindex,nofollow,noarchive,nosnippet,noodp,noydir" />
	% end
        <link href='https://fonts.googleapis.com/css?family=Lato:300,400,700' rel='stylesheet' type='text/css'>
	<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="stylesheet" href="{{ STATIC_URL }}css/custombootstrap.css" media="screen, projection"/>
        <link href="{{ STATIC_URL }}css/dc.css" media="all" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="{{ STATIC_URL }}css/base.css" media="screen, projection"/>
        
        <script type="text/javascript" src="{{ STATIC_URL }}js/libs/jquery-1.11.1.min.js"></script>
	<script type="text/javascript" src="{{ STATIC_URL }}js/libs/js.cookie.js"></script>
	<script type="text/javascript" src="{{ STATIC_URL }}js/footer.js"></script>

        <script src="{{STATIC_URL}}js/modernizr.custom.74326.js"></script>
	% for extra in extra_js:
		<script type="text/javascript" src="{{extra}}"></script>
	% end
	% for extra in extra_css:
		<link rel="stylesheet" href="{{ STATIC_URL }}css/{{extra}}" type="text/css" />
	% end

	% if twitter_card:
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:site" content="@voteview">
	<meta name="twitter:creator" content="@voteview">
	<meta name="twitter:title" content="{{twitter_card["title"]}}">
	<meta name="twitter:description" content="{{twitter_card["body"]}}">
	<meta name="twitter:image" content="https://voteview.polisci.ucla.edu/static/img/twitterCard/{{str(twitter_card["icpsr"]).zfill(6)}}.png">
	% end

    </head>
	% if not devserver:
    <body id="{{ body_id }}" class="{{ body_class }}">
	% else:
    <body id="{{ body_id }}" class="{{ body_class }}" style="border-left:20px solid red;">
	% end
        {{!base}}


	<div style="width:100%;height:120px;background-color:#3284bf;overflow:hidden;margin-top:30px;display:none;" id="footer">
		<div class="container" style="height:120px;">
			<span style="display:inline-block;height:100%;vertical-align:middle;"></span> 
			<a href="http://www.polisci.ucla.edu"><img src="{{ STATIC_URL }}img/UCLA.png" style="height: 96px; vertical-align:middle;"></a>
		</div>
	</div>
        <script type="text/javascript" src="{{ STATIC_URL }}js/libs/bootstrap.min.js"></script>
    </body>
</html>

