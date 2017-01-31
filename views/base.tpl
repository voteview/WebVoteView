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
        <meta http-equiv="content-type" content="text/html; charset=UTF8">
        <title>{{"DEV SERVER" if devserver==1 else "Voteview"}} | {{ title }}</title>
        <meta http-equiv="X-UA-Compatible" content="chrome=IE7" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
	<meta name="description" content="View, map, and investigate congressional votes throughout history, classify legislators as liberal or conservatives." />
	% if devserver:
	<meta name=”robots” content=”noindex,nofollow,noarchive,nosnippet,noodp,noydir" />
	% end
<style>
/* Temporarily inlining fonts locally while I investigate a bug. */
@font-face {
  font-family: 'Lato';
  font-style: normal;
  font-weight: 400;
  src: local('Lato Regular'), local('Lato Regular'), url('/static/fonts/LatoLatin-Regular.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
}
@font-face {
  font-family: 'Lato';
  font-style: normal;
  font-weight: 700;
  src: local('Lato Bold'), local('Lato-Bold'), url('/static/fonts/LatoLatin-Bold.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215;
}
</style>
	<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="stylesheet" href="{{ STATIC_URL }}css/custombootstrap.css" media="screen, projection, print"/>
        <link href="{{ STATIC_URL }}css/dc.css" media="all" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="{{ STATIC_URL }}css/base.css" media="screen, projection, print"/>
        
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
    <body id="{{ body_id }}" class="{{ body_class }} devbody">
	<div id="devHelpWidget" class="noprint">
		<a href="https://voteview.polisci.ucla.edu/" id="prodLink">
		<strong><big><big>View on production</big></big></strong>
		</a>
		<script>
			document.getElementById("prodLink").href = "https://voteview.polisci.ucla.edu"+window.location.href.split(".160")[1];
		</script>
	</div>
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

