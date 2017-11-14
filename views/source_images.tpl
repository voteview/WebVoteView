% rebase('base.tpl',title='Original sources')
% import json
% include('header.tpl')
This is the source image template page
<head>
    <title>bookreader demo</title>

    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes">

    <link rel="stylesheet" type="text/css" href="../BookReader/mmenu/dist/css/jquery.mmenu.css" />
    <link rel="stylesheet" type="text/css" href="../BookReader/mmenu/dist/addons/navbars/jquery.mmenu.navbars.css" />
    <link rel="stylesheet" type="text/css" href="../BookReader/BookReader.css" id="BRCSS"/>

    <!-- Custom CSS overrides -->
    <link rel="stylesheet" type="text/css" href="BookReaderDemo.css"/>

    <script type="text/javascript" src="./jquery-1.10.1.js"></script>
    <script type="text/javascript" src="../BookReader/jquery-ui-1.12.0.min.js"></script>
    <script type="text/javascript" src="../BookReader/jquery.browser.min.js"></script>
    <script type="text/javascript" src="../BookReader/dragscrollable-br.js"></script>
    <script type="text/javascript" src="../BookReader/jquery.colorbox-min.js"></script>
    <script type="text/javascript" src="../BookReader/jquery.bt.min.js"></script>
    <script type="text/javascript" src="../BookReader/soundmanager/script/soundmanager2-jsmin.js"></script>
    <script>
        soundManager.debugMode = false;
        soundManager.url = '../BookReader/soundmanager/swf';
        soundManager.useHTML5Audio = true;
        soundManager.flashVersion = 9; //flash 8 version of swf is buggy when calling play() on a sound that is still loading
    </script>
    <script type="text/javascript" src="../BookReader/mmenu/dist/js/jquery.mmenu.min.js"></script>
    <script type="text/javascript" src="../BookReader/mmenu/dist/addons/navbars/jquery.mmenu.navbars.min.js" ></script>
    <script type="text/javascript" src="../BookReader/BookReader.js"></script>

</head>
<body style="background-color: #939598;">
  <div id="BookReader" style="width:800px; height: 600px; overflow: hidden;">
      Internet Archive BookReader Demo!<br/>
      <noscript>
      <p>
          The BookReader requires JavaScript to be enabled. Please check that your browser supports JavaScript and that it is enabled in the browser settings.  You can also try one of the <a href="http://www.archive.org/details/goodytwoshoes00newyiala"> other formats of the book</a>.
      </p>
      </noscript>
  </div>
  <script type="text/javascript" src="BookReaderJSSimple.js"></script>
</body>
