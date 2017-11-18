% from __future__ import print_function

% rebase('base.tpl',title='File: views/source_images.tpl')
% import json
% include('header.tpl')



<div id='page-info'
  data-publication="{{publication}}"
  data-file-number="{{str(file_number).zfill(3)}}"
  data-page-number="{{page_number}}"
 ></div>






<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="apple-mobile-web-app-capable" content="yes">

<link rel="stylesheet" type="text/css" href="/static/BookReader/mmenu/dist/css/jquery.mmenu.css" />
<link rel="stylesheet" type="text/css" href="/static/BookReader/mmenu/dist/addons/navbars/jquery.mmenu.navbars.css" />
<link rel="stylesheet" type="text/css" href="/static/BookReader/BookReader.css" id="BRCSS"/>

<!-- Custom CSS overrides -->
<link rel="stylesheet" type="text/css" href="/static/BookReaderDemo/BookReaderDemo.css"/>

<script type="text/javascript" src="./jquery-1.10.1.js"></script>
<script type="text/javascript" src="/static/BookReader/jquery-ui-1.12.0.min.js"></script>
<script type="text/javascript" src="/static/BookReader/jquery.browser.min.js"></script>
<script type="text/javascript" src="/static/BookReader/dragscrollable-br.js"></script>
<script type="text/javascript" src="/static/BookReader/jquery.colorbox-min.js"></script>
<script type="text/javascript" src="/static/BookReader/jquery.bt.min.js"></script>
<script type="text/javascript" src="/static/BookReader/soundmanager/script/soundmanager2-jsmin.js"></script>
<script>
    soundManager.debugMode = false;
    soundManager.url = '/static/BookReader/soundmanager/swf';
    soundManager.useHTML5Audio = true;
    soundManager.flashVersion = 9; //flash 8 version of swf is buggy when calling play() on a sound that is still loading
</script>
<script type="text/javascript" src="/static/BookReader/mmenu/dist/js/jquery.mmenu.min.js"></script>
<script type="text/javascript" src="/static/BookReader/mmenu/dist/addons/navbars/jquery.mmenu.navbars.min.js" ></script>
<script type="text/javascript" src="/static/BookReader/BookReader.js"></script>


<div id="BookReader" >
  Internet Archive BookReader Demo<br/>
  <noscript>
  <p>
      The BookReader requires JavaScript to be enabled. Please check that your browser supports JavaScript and that it is enabled in the browser settings.
  </p>
  </noscript>
</div>
<script type="text/javascript" src="/static/BookReaderDemo/BookReaderJSSimple.js"></script>
