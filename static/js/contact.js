function showLoad()
{
	$("#contact-form > .loading_logo_hide").show();
}

function submitForm()
{
	$.ajax({
		type: "POST",
		url: "/api/contact",
		data: $('#contact-form').serialize(),
		beforeSend: function() { return; },
		success: (res, status, xhr) => {
			// Why is res["success"] needed? Because res["success"] is the API
			// return, while success above is the AJAX return.
			if (res["success"]) {
				let div = $("<div></div>")
					.attr({ "class": "alert alert-success" })
					.html(
						"Thank you for contacting us. We will get back to \
						 you as soon as possible.");
				$("#result_contact > div").remove();
				div.appendTo($("#result_contact"));
				$("#result_contact").fadeIn();
				$("#contact-form").slideUp();
				return;
			}

			let div = $("<div></div>")
				.attr({ "class": "alert alert-danger" })
				.html(res["error"]);
			$("#result_contact > div").remove();
			div.appendTo($("#result_contact"));
			$("#result_contact").fadeIn();
		}
	});
}

function newsletterSignup()
{
	$.ajax({
		type: "POST",
		url: "/api/newsletter",
		data: $('#update-form').serialize(),
		success: (res, status, xhr) => {
			if (res["success"]) {
				let div = $("<div></div>")
					.attr({ "class": "alert alert-success" })
					.html(
						`Your email address has been ${res["verb"]} our \
						 newsletter list.`);
				$("#result_newsletter > div").remove();
				div.appendTo($("#result_newsletter"));
				$("#result_newsletter").fadeIn();
				$("#update-form").slideUp();
				return;
			}

			var div = $("<div></div>")
				.attr({ "class": "alert alert-danger" })
				.html(res["error"]);
			$("#result_newsletter > div").remove();
			div.appendTo($("#result_newsletter"));
			$("#result_newsletter").fadeIn();
		}
	});
}
