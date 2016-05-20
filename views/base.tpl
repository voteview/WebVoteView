% STATIC_URL = "/static/"
% setdefault('title','UCLA')
% setdefault('extra_css','')
% setdefault('body_id', '')
% setdefault('body_class', '')
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>VoteView | {{ title }}</title>

        <meta http-equiv="X-UA-Compatible" content="chrome=IE7" />

        <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        <!-- <link rel="stylesheet" href="{{ STATIC_URL }}css/bootstrap.min.css" media="screen, projection"/> -->
        <link href='http://fonts.googleapis.com/css?family=Lato:300,400,700,900' rel='stylesheet' type='text/css'>

        <link rel="stylesheet" href="{{ STATIC_URL }}less/custombootstrap.css" media="screen, projection"/>
        <link href="{{ STATIC_URL }}css/dc.css" media="all" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="{{ STATIC_URL }}css/base.css" media="screen, projection"/>
        <!--[if lt IE 8]><link rel="stylesheet" href="{{STATIC_URL}}css/ie.css" type="text/css" media="screen, projection"><![endif]-->
        
        <script type="text/javascript" src="{{ STATIC_URL }}js/libs/jquery-1.11.1.min.js"></script>

         <!--[if (gte IE 6)&(lte IE 8)]>
                <script type="text/javascript" src="{{STATIC_URL}}js/selectivizr-min.js"></script>
                <script type="text/javascript" src="{{STATIC_URL}}js/respond.min.js"></script>
        <![endif]-->

        <script src="{{STATIC_URL}}js/modernizr.custom.74326.js"></script>

	% for extra in extra_css:
		<link rel="stylesheet" href="{{ STATIC_URL }}css/{{extra}}" type="text/css" />
	% end
    </head>
    <body id="{{ body_id }}" class="{{ body_class }}">
        <!--[if lt IE 8]>
            <div class="chromeframe">
                    <p>Hi. It looks like you're using an older browser.<br/>
                    Please <a href="http://browsehappy.com/">upgrade your browser</a> 
                    or <a href="http://www.google.com/chromeframe/?redirect=true">activate 
                        Google Chrome Frame</a> to improve your experience.
                    </p>
            </div>
        <![endif]-->
        {{!base}}
        <script type="text/javascript" src="{{ STATIC_URL }}js/libs/bootstrap.min.js"></script>
    </body>
</html>

