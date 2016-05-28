% rebase('base.tpl',title='About us', extra_js=["https://www.google.com/recaptcha/api.js"])

% include('header.tpl')

<!-- About.tpl: This is the template for an about us / help page. All the templating is done but we haven't written a message yet -->

<div class="container">
	<div class="row">
		<div class="col-md-9">
			<h3>About the project</h3>
		
			<p>
				1Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam quis accumsan velit. In imperdiet neque et tempor tincidunt. Maecenas eu magna ut mauris 
				auctor egestas sed vitae leo. Nam a ipsum in erat porttitor egestas. Duis a sagittis augue. Sed porta eget eros a accumsan. Nullam ultricies tristique 
				sollicitudin. Praesent sollicitudin consectetur dui, vel sollicitudin purus commodo vitae. Maecenas imperdiet, diam a aliquam ultricies, nunc ligula 
				iaculis metus, hendrerit consequat nibh nibh vel nisl. Suspendisse pharetra nec tellus eget suscipit. Maecenas a neque felis. Phasellus tincidunt nibh 
				id eleifend tempus. Mauris sed suscipit nisi. Praesent laoreet arcu sit amet est elementum volutpat.
			</p>

			<h3>Project Staff</h3>
			<ul>
				<li>Project Lead: Jeff Lewis, UCLA</li>
				<li>Adam Boche, UCLA</li>
				<li>Aaron Rudkin, UCLA</li>
				<li>Luke Sonnet, UCLA</li>
			</ul>

			<h3>Contact Us</h3>
			<form>
				<p>
					Subject: <input type="text" placeholder="Question about VoteView.com" style="width:63%;">
				</p>
				<textarea style="width:70%;height:250px;" placeholder="Type your message here. Please allow 48-72 hours for a response."></textarea>
				<script>
					function showSubmit() { $("#captcha_hide_submit").slideDown(); $("#captcha_click").slideUp(); }
				</script>
				<div id="captcha_click">
					Before you contact us, please click the box below to verify you are human:
					<div class="g-recaptcha" data-sitekey="6LetoCATAAAAAL3gjPGCEEFgf8iU9aM_m_RjgShd" data-callback="showSubmit"></div>
				</div>
				<div id="captcha_hide_submit" style="display:none;">
					<input type="submit" />
				</div>
			</form>
			
			<h3>Licence and Code</h3>
		
			<p>VoteView code available on GitHub:</p>
			<ul>
				<li><a href="https://github.com/JeffreyBLewis/congressional-district-boundaries">Congressional District Boundaries JSON data</a></li>
				<li><a href="https://github.com/JeffreyBLewis/Rvoteview">Rvoteview R Package</a></li>
				<li><a href="https://github.com/JeffreyBLewis/WebVoteView">WebVoteView site source</a></li>
			</ul>

			<p>Some graphics used under license:</p>
			<ul>
				<li><a href="http://www.flaticon.com/packs/arrows-pack/">Freepik Arrows Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/packs/data-analytics">Freepik Data Analytics Pack</a></li>
				<li><a href="http://www.flaticon.com/packs/thin-line-ui">Eleonor Wang Thin UI Pack</a></li>
			</ul>

			<p>External code libraries:</p>
			<ul>
				<li><a href="https://github.com/twbs/bootstrap">Bootstrap.js</a> by Twitter, Inc.</li>
				<li><a href="https://github.com/dc-js/dc.js">DC.js</a></li>
				<li><a href="https://github.com/jquery/jquery">jQuery</a> by jQuery Foundation</li>
				<li><a href="https://github.com/exupero/saveSvgAsPng">saveSvgAsPng</a> by Eric Shull</li>
			</ul>


			<br/><br/><br/>
		</div>		
	</div>
</div>
